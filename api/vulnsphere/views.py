from rest_framework import viewsets, permissions, status
from rest_framework import decorators, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend

from .models import User, Company, Asset, Project, Vulnerability, VulnerabilityAsset, Retest, Comment, Attachment, ActivityLog, ProjectAsset, ReportTemplate, GeneratedReport, VulnerabilityTemplate
from .serializers import (
    UserSerializer, CompanySerializer,
    AssetSerializer, ProjectSerializer, VulnerabilitySerializer, VulnerabilityAssetSerializer,
    RetestSerializer, CommentSerializer, AttachmentSerializer, ActivityLogSerializer,
    ReportTemplateSerializer, GeneratedReportSerializer, ReportGenerationRequestSerializer,
    VulnerabilityTemplateSerializer
)
from .report_generator import ReportGenerator
from .permissions import IsAdmin, IsAdminOrTester, IsTesterOrAdmin, CanRequestRetest, IsCompanyMember, IsClientReadOnly

from rest_framework.pagination import PageNumberPagination

class StandardPagination(PageNumberPagination):
    page_size = 15  # Default fallback
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_page_size(self, request):
        if hasattr(request, 'query_params') and 'page_size' in request.query_params:
            try:
                page_size = int(request.query_params.get('page_size', self.page_size))
                if page_size > 0 and page_size <= self.max_page_size:
                    return page_size
            except (ValueError, TypeError):
                pass
        return self.page_size

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination

    @decorators.action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

class CompanyViewSet(viewsets.ModelViewSet):
    """
    Admin: Full access to all companies.
    Clients/Testers: Can only view companies they are assigned to.
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    pagination_class = StandardPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTesterOrAdmin()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admins see all companies
        if user.role == 'ADMIN':
            return Company.objects.all()
        
        # Clients and Testers only see companies they are assigned to
        return user.companies.all()

# CompanyMembershipViewSet removed - users now have global roles


class CompanyScopedMixin:
    """
    Mixin to filter queryset by company in URL and verify permissions.
    Expects 'company_pk' in kwargs.
    Filters based on user's accessible companies.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        company_pk = self.kwargs.get('company_pk')
        if not company_pk:
            return self.queryset.none()
        
        user = self.request.user
        
        # Check if user has access to this company
        if user.role != 'ADMIN':
            # Clients and Testers must be assigned to the company
            if not user.companies.filter(pk=company_pk).exists():
                return self.queryset.none()
        
        return self.queryset.filter(company__pk=company_pk)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if 'company_pk' in self.kwargs:
            context['company'] = get_object_or_404(Company, pk=self.kwargs['company_pk'])
        return context

class AssetViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated, IsClientReadOnly]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'identifier', 'type']

    @decorators.action(detail=False, methods=['get'], url_path='csv-template')
    def csv_template(self, request, **kwargs):
        """Download CSV template for bulk importing assets"""
        from django.http import HttpResponse
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['name', 'type', 'identifier', 'description', 'is_active'])
        writer.writerow(['Main Web App', 'WEB_APP', 'https://example.com', 'Production web application', 'true'])
        writer.writerow(['API Server', 'API', 'api.example.com', 'REST API backend', 'true'])
        
        output.seek(0)
        resp = HttpResponse(output.read(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename="assets_import.csv"'
        return resp

    @decorators.action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request, **kwargs):
        """Bulk import assets from CSV"""
        import csv
        import io
        
        company_pk = self.kwargs.get('company_pk')
        if not company_pk:
            return Response({'error': 'Company context required'}, status=status.HTTP_400_BAD_REQUEST)
        
        company = get_object_or_404(Company, pk=company_pk)
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            content = file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(content))
            
            created = []
            errors = []
            valid_types = ['WEB_APP', 'SERVER', 'API', 'MOBILE_APP', 'NETWORK_DEVICE', 'OTHER']
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    asset_type = row.get('type', 'OTHER').strip().upper()
                    if asset_type not in valid_types:
                        asset_type = 'OTHER'
                    
                    is_active = row.get('is_active', 'true').strip().lower() in ['true', '1', 'yes']
                    
                    asset = Asset.objects.create(
                        company=company,
                        name=row['name'].strip(),
                        type=asset_type,
                        identifier=row.get('identifier', '').strip(),
                        description=row.get('description', '').strip(),
                        is_active=is_active
                    )
                    created.append({'id': str(asset.id), 'name': asset.name})
                except Exception as e:
                    errors.append({'row': row_num, 'error': str(e)})
            
            return Response({
                'created': len(created),
                'errors': errors,
                'items': created
            }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class ProjectViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'summary']
    permission_classes = [permissions.IsAuthenticated, IsClientReadOnly]
    
    def get_queryset(self):
        """Support both /projects/{id}/ and /companies/{cid}/projects/{id}/"""
        company_pk = self.kwargs.get('company_pk')
        user = self.request.user
        
        if company_pk:
            # Nested access - filter by company
            # CompanyScopedMixin already handles company access check
            queryset = Project.objects.filter(company__pk=company_pk)
        else:
            # Direct access - filter by user's accessible companies
            if user.role == 'ADMIN':
                queryset = Project.objects.all()
            else:
                # Clients and Testers only see projects from their assigned companies
                queryset = Project.objects.filter(company__in=user.companies.all())
        
        # Hide draft projects from clients
        if user.role == 'CLIENT':
            queryset = queryset.exclude(status='DRAFT')
        
        return queryset

class VulnerabilityViewSet(viewsets.ModelViewSet):
    queryset = Vulnerability.objects.all()
    serializer_class = VulnerabilitySerializer
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'code']
    
    # Nested under Project, so we get project_pk and company_pk (from parent router)
    # URL: /companies/{cid}/projects/{pid}/vulnerabilities/
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsClientReadOnly()]

    def get_queryset(self):
        project_pk = self.kwargs.get('project_pk')
        company_pk = self.kwargs.get('company_pk')
        user = self.request.user
        
        if not project_pk or not company_pk:
            return Vulnerability.objects.none()
        
        # Check if user has access to this company
        if user.role != 'ADMIN':
            if not user.companies.filter(pk=company_pk).exists():
                return Vulnerability.objects.none()
        
        # Ensure project belongs to company
        queryset = Vulnerability.objects.filter(project__pk=project_pk, project__company__pk=company_pk)
        
        # Hide draft vulnerabilities from clients
        if user.role == 'CLIENT':
            queryset = queryset.exclude(status='DRAFT')
        
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        project_pk = self.kwargs.get('project_pk')
        company_pk = self.kwargs.get('company_pk')
        
        if project_pk and company_pk:
            context['project'] = get_object_or_404(Project, pk=project_pk, company__pk=company_pk)
        
        return context


    @decorators.action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, project_pk=None, company_pk=None, pk=None):
        vuln = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
             return Response({'error': 'Status required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if new_status not in Vulnerability.Status.values:
             return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = vuln.status
        vuln.status = new_status
        vuln.last_edited_by = request.user
        vuln.save()
        
        # Log activity
        ActivityLog.objects.create(
            company=vuln.project.company,
            user=request.user,
            entity_type='VULNERABILITY',
            entity_id=vuln.pk,
            action='STATUS_CHANGED',
            metadata={'old_status': old_status, 'new_status': new_status}
        )
        
        return Response({'status': 'updated', 'new_status': new_status})

    @decorators.action(detail=False, methods=['get'], url_path='csv-template')
    def csv_template(self, request, **kwargs):
        """Download CSV template for bulk importing vulnerabilities"""
        from django.http import HttpResponse
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['title', 'severity', 'status', 'cvss_base_score', 'cvss_vector', 'details_md', 'references'])
        writer.writerow(['SQL Injection in Login', 'HIGH', 'OPEN', '8.5', 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 
                        '## Description\nSQL injection found in the login form...', 'https://owasp.org/sqli'])
        
        output.seek(0)
        resp = HttpResponse(output.read(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename="vulnerabilities_import.csv"'
        return resp

    @decorators.action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request, **kwargs):
        """Bulk import vulnerabilities from CSV"""
        import csv
        import io
        
        project_pk = self.kwargs.get('project_pk')
        company_pk = self.kwargs.get('company_pk')
        
        if not project_pk or not company_pk:
            return Response({'error': 'Project context required'}, status=status.HTTP_400_BAD_REQUEST)
        
        project = get_object_or_404(Project, pk=project_pk, company__pk=company_pk)
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            content = file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(content))
            
            created = []
            errors = []
            valid_severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
            valid_statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK', 'FALSE_POSITIVE', 'RETEST_PENDING', 'RETEST_FAILED']
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    severity = row.get('severity', 'MEDIUM').strip().upper()
                    if severity not in valid_severities:
                        severity = 'MEDIUM'
                    
                    vuln_status = row.get('status', 'OPEN').strip().upper()
                    if vuln_status not in valid_statuses:
                        vuln_status = 'OPEN'
                    
                    # Parse references
                    refs = row.get('references', '')
                    if isinstance(refs, str) and refs:
                        references = [r.strip() for r in refs.split(',') if r.strip()]
                    else:
                        references = []
                    
                    # Parse CVSS score
                    cvss_score = row.get('cvss_base_score', '').strip()
                    cvss_score = float(cvss_score) if cvss_score else None
                    
                    vuln = Vulnerability.objects.create(
                        project=project,
                        title=row['title'].strip(),
                        severity=severity,
                        status=vuln_status,
                        cvss_base_score=cvss_score,
                        cvss_vector=row.get('cvss_vector', '').strip(),
                        details_md=row.get('details_md', '').strip(),
                        references=references,
                        created_by=request.user,
                        last_edited_by=request.user
                    )
                    created.append({'id': str(vuln.id), 'title': vuln.title})
                except Exception as e:
                    errors.append({'row': row_num, 'error': str(e)})
            
            return Response({
                'created': len(created),
                'errors': errors,
                'items': created
            }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)
        
        except Exception as e:
            return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


class VulnerabilityAssetViewSet(viewsets.ModelViewSet):
    serializer_class = VulnerabilityAssetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        vulnerability_pk = self.kwargs.get('vulnerability_pk')
        if not vulnerability_pk:
            return VulnerabilityAsset.objects.none()
        return VulnerabilityAsset.objects.filter(vulnerability__pk=vulnerability_pk)

    def perform_create(self, serializer):
        vulnerability_pk = self.kwargs.get('vulnerability_pk')
        project_pk = self.kwargs.get('project_pk')
        company_pk = self.kwargs.get('company_pk')
        
        vulnerability = get_object_or_404(Vulnerability, pk=vulnerability_pk, project__pk=project_pk, project__company__pk=company_pk)
        serializer.save(vulnerability=vulnerability)


class RetestViewSet(viewsets.ModelViewSet):
    queryset = Retest.objects.all()
    serializer_class = RetestSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'request_retest']:
            return [permissions.IsAuthenticated()]
        # CREATE, UPDATE, DELETE: Only Testers and Admins
        return [permissions.IsAuthenticated(), IsClientReadOnly()]

    def get_queryset(self):
        vuln_pk = self.kwargs.get('vulnerability_pk')
        user = self.request.user
        
        if not vuln_pk:
            return Retest.objects.none()
        
        # Filter retests by company access through vulnerability
        queryset = Retest.objects.filter(vulnerability__pk=vuln_pk)
        
        # Check company access
        if user.role != 'ADMIN':
            queryset = queryset.filter(
                vulnerability__project__company__in=user.companies.all()
            )
        
        return queryset

    def check_permissions(self, request):
        super().check_permissions(request)

    def filter_queryset(self, queryset):
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if 'vulnerability_pk' in self.kwargs:
            context['vulnerability'] = get_object_or_404(Vulnerability, pk=self.kwargs['vulnerability_pk'])
        return context
    
    def perform_create(self, serializer):
        retest = serializer.save()
        
        # Update vulnerability status based on retest result
        if retest.request_type == 'RETEST' and retest.status:
            vulnerability = retest.vulnerability
            
            if retest.status == 'PASSED':
                vulnerability.status = 'RESOLVED'
            elif retest.status == 'FAILED':
                vulnerability.status = 'RETEST_FAILED'
            vulnerability.save(update_fields=['status'])
            
            # Log the status change
            from .models import ActivityLog
            ActivityLog.objects.create(
                company=vulnerability.project.company,
                user=self.request.user,
                entity_type='VULNERABILITY',
                entity_id=vulnerability.pk,
                action='STATUS_CHANGED',
                metadata={
                    'title': vulnerability.title,
                    'new_status': vulnerability.status,
                    'retest_id': str(retest.pk),
                    'retest_status': retest.status
                }
            )
    
    def perform_update(self, serializer):
        retest = serializer.save()
        
        # Update vulnerability status if retest result changed
        if retest.request_type == 'RETEST' and retest.status:
            vulnerability = retest.vulnerability
            
            if retest.status == 'PASSED':
                vulnerability.status = 'RESOLVED'
            elif retest.status == 'FAILED':
                vulnerability.status = 'RETEST_FAILED'
            vulnerability.save(update_fields=['status'])
            
            # Log the status change
            from .models import ActivityLog
            ActivityLog.objects.create(
                company=vulnerability.project.company,
                user=self.request.user,
                entity_type='VULNERABILITY',
                entity_id=vulnerability.pk,
                action='STATUS_CHANGED',
                metadata={
                    'title': vulnerability.title,
                    'new_status': vulnerability.status,
                    'retest_id': str(retest.pk),
                    'retest_status': retest.status
                }
            )
    
    @decorators.action(detail=False, methods=['post'], url_path='request')
    def request_retest(self, request, company_pk=None, project_pk=None, vulnerability_pk=None):
        """Allow clients to request retests"""
        vulnerability = get_object_or_404(Vulnerability, pk=vulnerability_pk)
        
        # Check company access
        if request.user.role != 'ADMIN':
            if not request.user.companies.filter(pk=vulnerability.project.company.pk).exists():
                return Response(
                    {'error': 'You do not have access to this vulnerability'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Create retest request
        notes = request.data.get('notes_md', '')
        retest = Retest.objects.create(
            vulnerability=vulnerability,
            requested_by=request.user,
            request_type='REQUEST',
            notes_md=notes
        )
        
        # Update vulnerability status to RETEST_PENDING
        vulnerability.status = 'RETEST_PENDING'
        vulnerability.save(update_fields=['status'])
        
        # Activity log is created automatically via signal
        # But let's create a specific one for the status change
        from .models import ActivityLog
        ActivityLog.objects.create(
            company=vulnerability.project.company,
            user=request.user,
            entity_type='VULNERABILITY',
            entity_id=vulnerability.pk,
            action='STATUS_CHANGED',
            metadata={
                'title': vulnerability.title,
                'old_status': 'various',
                'new_status': 'RETEST_PENDING',
                'retest_id': str(retest.pk),
                'notes': notes[:200] if notes else None
            }
        )
        
        serializer = self.get_serializer(retest)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = Comment.objects.all()

        # Filter by vulnerability if query param provided
        vulnerability_id = self.request.query_params.get('vulnerability')
        if vulnerability_id:
            queryset = queryset.filter(vulnerability__pk=vulnerability_id)

        # Filter comments by company access
        if user.role != 'ADMIN':
            queryset = queryset.filter(company__in=user.companies.all())
        
        # Clients cannot see internal comments
        if user.role == 'CLIENT':
            queryset = queryset.filter(is_internal=False)

        return queryset
    
    def perform_create(self, serializer):
        # Extract IDs from request data
        company_id = self.request.data.get('company')
        project_id = self.request.data.get('project')
        vulnerability_id = self.request.data.get('vulnerability')
        retest_id = self.request.data.get('retest')
        
        # Get actual objects
        context_additions = {}
        if company_id:
            from django.shortcuts import get_object_or_404
            context_additions['company'] = get_object_or_404(Company, pk=company_id)
        if project_id:
            from django.shortcuts import get_object_or_404
            context_additions['project'] = get_object_or_404(Project, pk=project_id)
        if vulnerability_id:
            from django.shortcuts import get_object_or_404
            context_additions['vulnerability'] = get_object_or_404(Vulnerability, pk=vulnerability_id)
        if retest_id:
            from django.shortcuts import get_object_or_404
            context_additions['retest'] = get_object_or_404(Retest, pk=retest_id)
        
        # Save with context
        serializer.save(**context_additions)


class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    
    def get_queryset(self):
        user = self.request.user
        qs = Attachment.objects.all()
        
        # Handle nesting:
        project_pk = self.kwargs.get('project_pk')
        vulnerability_pk = self.kwargs.get('vulnerability_pk')

        if project_pk:
            qs = qs.filter(project__pk=project_pk)
        if vulnerability_pk:
            qs = qs.filter(vulnerability__pk=vulnerability_pk)
        
        # All  users can see all attachments (global roles)
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        project_pk = self.kwargs.get('project_pk')
        vulnerability_pk = self.kwargs.get('vulnerability_pk')
        company_pk = self.kwargs.get('company_pk')

        if project_pk:
            # Optionally check company_pk match if strictly nested
            criteria = {'pk': project_pk}
            if company_pk:
                criteria['company__pk'] = company_pk
            context['project'] = get_object_or_404(Project, **criteria)
            
        if vulnerability_pk:
            criteria = {'pk': vulnerability_pk}
            if project_pk:
                criteria['project__pk'] = project_pk
            if company_pk:
                # project is a property on vuln in viewsets usage indirectly via query, but here:
                # Vulnerability model has project field.
                criteria['project__company__pk'] = company_pk
            context['vulnerability'] = get_object_or_404(Vulnerability, **criteria)
            
        return context


class ProjectAssetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing project-asset attachments.
    Nested under /companies/{cid}/projects/{pid}/assets/
    """
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_permissions(self):
        # Only testers/admins can attach/detach, everyone can list
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsTesterOrAdmin()]
    
    def get_queryset(self):
        project_pk = self.kwargs.get('project_pk')
        company_pk = self.kwargs.get('company_pk')
        
        if not project_pk or not company_pk:
            return Asset.objects.none()
        
        # Return only assets attached to this project
        return Asset.objects.filter(
            projects__pk=project_pk,
            projects__company__pk=company_pk
        )
    
    def create(self, request, *args, **kwargs):
        """Attach an asset to the project"""
        project_pk = self.kwargs.get('project_pk')
        company_pk = self.kwargs.get('company_pk')
        asset_id = request.data.get('assetId')
        
        if not asset_id:
            return Response(
                {'error': 'assetId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        project = get_object_or_404(Project, pk=project_pk, company__pk=company_pk)
        asset = get_object_or_404(Asset, pk=asset_id, company__pk=company_pk)
        
        # Create or update the ProjectAsset
        project_asset, created = ProjectAsset.objects.get_or_create(
            project=project,
            asset=asset,
            defaults={'attached_by': request.user, 'auto_attached': False}
        )
        
        if not created and project_asset.auto_attached:
            # If it was auto-attached, mark it as manually confirmed
            project_asset.auto_attached = False
            project_asset.attached_by = request.user
            project_asset.save()
        
        return Response(AssetSerializer(asset).data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """Detach an asset from the project"""
        project_pk = self.kwargs.get('project_pk')
        company_pk = self.kwargs.get('company_pk')
        asset_id = kwargs.get('pk')
        
        project_asset = get_object_or_404(
            ProjectAsset,
            project__pk=project_pk,
            project__company__pk=company_pk,
            asset__pk=asset_id
        )
        
        project_asset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['post'])
    def attach_all(self, request, company_pk=None, project_pk=None):
        """Attach all company assets to the project"""
        project = get_object_or_404(Project, pk=project_pk, company__pk=company_pk)
        
        # Get all assets from the company that are not already attached
        attached_asset_ids = ProjectAsset.objects.filter(
            project=project
        ).values_list('asset_id', flat=True)
        
        assets_to_attach = Asset.objects.filter(
            company__pk=company_pk
        ).exclude(
            id__in=attached_asset_ids
        )
        
        # Bulk create ProjectAsset objects
        with transaction.atomic():
            project_assets = []
            for asset in assets_to_attach:
                project_assets.append(ProjectAsset(
                    project=project,
                    asset=asset,
                    attached_by=request.user,
                    auto_attached=False
                ))
            
            ProjectAsset.objects.bulk_create(project_assets)
        
        return Response({
            'message': f'Attached {len(project_assets)} assets to the project',
            'count': len(project_assets)
        })
    
    @action(detail=False, methods=['post'])
    def detach_all(self, request, company_pk=None, project_pk=None):
        """Detach all assets from the project"""
        project = get_object_or_404(Project, pk=project_pk, company__pk=company_pk)
        
        # Get all attached assets and delete them
        with transaction.atomic():
            deleted_count, _ = ProjectAsset.objects.filter(project=project).delete()
        
        return Response({
            'message': f'Detached {deleted_count} assets from the project',
            'count': deleted_count
        })

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    pagination_class = StandardPagination
    
    def get_queryset(self):
        user = self.request.user
        company_pk = self.kwargs.get('company_pk')
        
        # If accessed via /companies/{id}/activity/ - filter by company
        if company_pk:
            # Only admins can access company-specific activity logs
            if user.role != 'ADMIN':
                return ActivityLog.objects.none()
            return ActivityLog.objects.filter(company__pk=company_pk).order_by('-created_at')
        
        # If accessed via /activity-logs/ (global endpoint) - only admins can access
        if user.role == 'ADMIN':
            return ActivityLog.objects.all().order_by('-created_at')
        
        # Non-admins have no access to activity logs
        return ActivityLog.objects.none()



class DashboardStatsViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard statistics.
    Returns aggregated data across companies the user has access to.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_accessible_companies(self, user):
        """Get companies the user has access to based on role"""
        if user.role == 'ADMIN':
            return Company.objects.all()
        
        # Clients and Testers only see their assigned companies
        return user.companies.all()

    @decorators.action(detail=False, methods=['get'])
    def overview(self, request):
        """Get dashboard overview statistics"""
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        
        user = request.user
        companies = self._get_accessible_companies(user)
        
        # Get all projects for accessible companies
        projects = Project.objects.filter(company__in=companies)
        
        # Get all vulnerabilities for accessible companies
        vulnerabilities = Vulnerability.objects.filter(project__company__in=companies)
        
        # Basic counts
        total_projects = projects.count()
        total_vulnerabilities = vulnerabilities.count()
        critical_vulnerabilities = vulnerabilities.filter(severity='CRITICAL').count()
        
        # Vulnerability counts by severity
        severity_distribution = {
            'critical': vulnerabilities.filter(severity='CRITICAL').count(),
            'high': vulnerabilities.filter(severity='HIGH').count(),
            'medium': vulnerabilities.filter(severity='MEDIUM').count(),
            'low': vulnerabilities.filter(severity='LOW').count(),
            'info': vulnerabilities.filter(severity='INFO').count(),
        }
        
        # Vulnerability counts by status
        status_distribution = {
            'open': vulnerabilities.filter(status='OPEN').count(),
            'in_progress': vulnerabilities.filter(status='IN_PROGRESS').count(),
            'resolved': vulnerabilities.filter(status='RESOLVED').count(),
            'accepted_risk': vulnerabilities.filter(status='ACCEPTED_RISK').count(),
            'false_positive': vulnerabilities.filter(status='FALSE_POSITIVE').count(),
        }
        
        # Recent activity count (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_activity_count = ActivityLog.objects.filter(
            company__in=companies,
            created_at__gte=seven_days_ago
        ).count()
        
        # Recent vulnerabilities (last 10)
        recent_vulnerabilities = vulnerabilities.order_by('-created_at')[:10]
        recent_vulns_data = [{
            'id': str(vuln.id),
            'title': vuln.title,
            'severity': vuln.severity,
            'status': vuln.status,
            'project_id': str(vuln.project.id),
            'project_title': vuln.project.title,
            'company_id': str(vuln.project.company.id),
            'company_name': vuln.project.company.name,
            'created_at': vuln.created_at.isoformat(),
        } for vuln in recent_vulnerabilities]
        
        # Recent projects (last 10)
        recent_projects = projects.order_by('-created_at')[:10]
        recent_projects_data = [{
            'id': str(project.id),
            'title': project.title,
            'status': project.status,
            'company_id': str(project.company.id),
            'company_name': project.company.name,
            'start_date': project.start_date.isoformat(),
            'end_date': project.end_date.isoformat(),
            'vulnerability_count': project.vulnerabilities.count(),
            'created_at': project.created_at.isoformat(),
        } for project in recent_projects]
        
        # Vulnerability trend (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        trend_data = []
        for i in range(30):
            date = (datetime.now() - timedelta(days=29-i)).date()
            count = vulnerabilities.filter(
                created_at__date=date
            ).count()
            trend_data.append({
                'date': date.isoformat(),
                'count': count
            })
        
        return Response({
            'total_vulnerabilities': total_vulnerabilities,
            'total_projects': total_projects,
            'critical_vulnerabilities': critical_vulnerabilities,
            'recent_activity_count': recent_activity_count,
            'severity_distribution': severity_distribution,
            'status_distribution': status_distribution,
            'recent_vulnerabilities': recent_vulns_data,
            'recent_projects': recent_projects_data,
            'vulnerability_trend': trend_data,
        })


class ReportTemplateViewSet(viewsets.ModelViewSet):
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated] # Admin only for modification?
    pagination_class = StandardPagination
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdmin()]
        return [permissions.IsAuthenticated()]
    
    @decorators.action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        from django.http import FileResponse
        import os
        
        template = self.get_object()
        if not template.file:
             return Response({'error': 'Template file not found'}, status=status.HTTP_404_NOT_FOUND)
        
        file_handle = template.file.open()
        
        # Set content type based on format
        content_type = 'application/octet-stream'
        filename = template.file.name.lower()
        if filename.endswith('.html'):
            content_type = 'text/html'
        elif filename.endswith('.docx'):
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(template.file.name)}"'
        return response

class VulnerabilityTemplateViewSet(viewsets.ModelViewSet):
    queryset = VulnerabilityTemplate.objects.all()
    serializer_class = VulnerabilityTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['title', 'details_md']
    filterset_fields = ['severity']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsTesterOrAdmin()]
        # For list/retrieve actions, allow admins and testers, but not clients
        return [permissions.IsAuthenticated(), IsTesterOrAdmin()]

    def get_queryset(self):
        user = self.request.user
        
        # Only admins and testers can access templates
        if user.role in ['ADMIN', 'TESTER']:
            return VulnerabilityTemplate.objects.all()
        
        # Clients have no access to templates
        return VulnerabilityTemplate.objects.none()

    @decorators.action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        from django.http import FileResponse
        import os
        
        template = self.get_object()
        if not template.file:
             return Response({'error': 'Template file not found'}, status=status.HTTP_404_NOT_FOUND)
        
        file_handle = template.file.open()
        
        # Set content type based on format
        content_type = 'application/octet-stream'
        filename = template.file.name.lower()
        if filename.endswith('.html'):
            content_type = 'text/html'
        elif filename.endswith('.docx'):
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(template.file.name)}"'
        return response

    @decorators.action(detail=False, methods=['get'], url_path='csv-template')
    def csv_template(self, request):
        """Download CSV template for bulk importing vulnerability templates"""
        from django.http import HttpResponse
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['title', 'severity', 'cvss_base_score', 'cvss_vector', 'details_md', 'references'])
        writer.writerow(['Example SQL Injection', 'HIGH', '8.5', 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', 
                        '## Description\nSQL injection vulnerability...', 'https://owasp.org/sqli'])
        
        output.seek(0)
        resp = HttpResponse(output.read(), content_type='text/csv')
        resp['Content-Disposition'] = 'attachment; filename="vulnerability_templates_import.csv"'
        return resp

    @decorators.action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import(self, request):
        """Bulk import vulnerability templates from CSV"""
        import csv
        import io
        
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not file.name.endswith('.csv'):
            return Response({'error': 'File must be a CSV'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            content = file.read().decode('utf-8')
            reader = csv.DictReader(io.StringIO(content))
            
            created = []
            errors = []
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header
                try:
                    # Parse references as list (comma-separated if string)
                    refs = row.get('references', '')
                    if isinstance(refs, str) and refs:
                        references = [r.strip() for r in refs.split(',') if r.strip()]
                    else:
                        references = []
                    
                    # Parse CVSS score
                    cvss_score = row.get('cvss_base_score', '').strip()
                    cvss_score = float(cvss_score) if cvss_score else None
                    
                    template_title = row['title'].strip()
                    
                    # Check if template already exists and update it, or create new
                    template, created_new = VulnerabilityTemplate.objects.update_or_create(
                        title=template_title,
                        defaults={
                            'severity': row['severity'].strip().upper(),
                            'cvss_base_score': cvss_score,
                            'cvss_vector': row.get('cvss_vector', '').strip(),
                            'details_md': row.get('details_md', '').strip(),
                            'references': references,
                            'created_by': request.user
                        }
                    )
                    
                    action = 'created' if created_new else 'updated'
                    created.append({'id': str(template.id), 'title': template.title, 'action': action})
                except Exception as e:
                    errors.append({'row': row_num, 'error': str(e)})
            
            created_count = len([item for item in created if item['action'] == 'created'])
            updated_count = len([item for item in created if item['action'] == 'updated'])
            
            return Response({
                'created': created_count,
                'updated': updated_count,
                'total': len(created),
                'errors': errors,
                'items': created
            }, status=status.HTTP_201_CREATED if created_count > 0 else status.HTTP_200_OK)
        
        except Exception as e:
            return Response({'error': f'Failed to parse CSV: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

class GeneratedReportViewSet(viewsets.ModelViewSet):
    queryset = GeneratedReport.objects.all()
    serializer_class = GeneratedReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields = ['project__title', 'template__name', 'company__name', 'format']
    filterset_fields = ['company__name', 'company'] # Allow filtering by company name or ID
    ordering_fields = ['created_at', 'status']

    def get_queryset(self):
        user = self.request.user
        
        # Filter reports by accessible companies
        if user.role == 'ADMIN':
            return GeneratedReport.objects.all().order_by('-created_at')
        
        # Clients and Testers only see reports from their assigned companies
        return GeneratedReport.objects.filter(
            company__in=user.companies.all()
        ).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @decorators.action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        from django.http import FileResponse
        import os
        
        report = self.get_object()
        if not report.file:
             return Response({'error': 'Report file not found'}, status=status.HTTP_404_NOT_FOUND)
        
        file_handle = report.file.open()
        
        # Set content type based on format
        content_type = 'application/octet-stream'
        if report.format == 'HTML':
            content_type = 'text/html'
        elif report.format == 'DOCX':
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            
        response = FileResponse(file_handle, content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(report.file.name)}"'
        return response

    @decorators.action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = ReportGenerationRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        template_id = serializer.validated_data['template_id']
        project_id = serializer.validated_data.get('project_id')
        company_id = serializer.validated_data.get('company_id')

        template = get_object_or_404(ReportTemplate, pk=template_id)

        # Infer format from template extension
        filename = template.file.name.lower()
        if filename.endswith('.html'):
            output_format = 'HTML'
        elif filename.endswith('.docx'):
            output_format = 'DOCX'
        else:
            output_format = 'DOCX' # Default fallback
        
        # Create GeneratedReport entry
        report_instance = GeneratedReport.objects.create(
            template=template,
            format=output_format,
            created_by=request.user
        )
        
        try:
            generator = ReportGenerator()
            context = {}
            
            # Determine if we should embed images inline (for HTML only)
            inline_images = (output_format == 'HTML')
            
            if project_id:
                project = get_object_or_404(Project, pk=project_id)
                report_instance.project = project
                report_instance.company = project.company
                context = generator.get_project_context(project, inline_images=inline_images)
            elif company_id:
                company = get_object_or_404(Company, pk=company_id)
                report_instance.company = company
                context = generator.get_company_context(company, inline_images=inline_images)
            
            report_instance.save()
            
            report_instance.save()
            
            # Generate asynchronously? For now, synchronously.
            generator.generate_report(template, context, output_format, report_instance)
            
            return Response(
                GeneratedReportSerializer(report_instance).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            # Error handling is done inside generate_report for modifying the instance,
            # but we also catch here to return response if it bubbles up or if setup failed.
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
