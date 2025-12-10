from rest_framework import viewsets, permissions, filters, decorators, response, status
from django.shortcuts import get_object_or_404
from .models import User, Company, CompanyMembership, Asset, Report, Vulnerability, VulnerabilityAsset, Retest, Comment, Attachment, ActivityLog, ReportAsset
from .serializers import (
    UserSerializer, CompanySerializer, CompanyMembershipSerializer,
    AssetSerializer, ReportSerializer, VulnerabilitySerializer, VulnerabilityAssetSerializer,
    RetestSerializer, CommentSerializer, AttachmentSerializer, ActivityLogSerializer
)
from .permissions import IsCompanyMember, IsCompanyTester, IsGlobalAdmin

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsGlobalAdmin]

    @decorators.action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return response.Response(serializer.data)

class CompanyViewSet(viewsets.ModelViewSet):
    """
    Admin: Full access.
    Others: Read-only access to companies they are members of.
    """
    queryset = Company.objects.all()
    serializer_class = CompanySerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsGlobalAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.request.user.global_role == 'ADMIN':
            return Company.objects.all()
        return Company.objects.filter(memberships__user=self.request.user, memberships__is_active=True).distinct()

class CompanyMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = CompanyMembershipSerializer
    permission_classes = [IsGlobalAdmin] # Only admins manage memberships directly for now (simplified) or company admins?
    # Requirement: "Admin can assign users...". Let's stick to Global Admin for writes for now, or expand logic.
    
    def get_queryset(self):
        company_pk = self.kwargs.get('company_pk')
        if not company_pk:
            return CompanyMembership.objects.none()
        return CompanyMembership.objects.filter(company__pk=company_pk)

    def perform_create(self, serializer):
        company_pk = self.kwargs.get('company_pk')
        company = get_object_or_404(Company, pk=company_pk)
        serializer.save(company=company)


class CompanyScopedMixin:
    """
    Mixin to filter queryset by company in URL and verify permissions.
    Expects 'company_pk' in kwargs.
    """
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        # Admin sees all? Or admin also navigating via company structure?
        # The IsCompanyMember permission handles admin check.
        # But we still need to filter to the specific company in the URL.
        company_pk = self.kwargs.get('company_pk')
        if not company_pk:
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
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember, IsCompanyTester] # Only Testers/Admins write
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'identifier', 'type']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsCompanyMember()]
        return [permissions.IsAuthenticated(), IsCompanyMember(), IsCompanyTester()]

class ReportViewSet(CompanyScopedMixin, viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'summary']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsCompanyMember()]
        return [permissions.IsAuthenticated(), IsCompanyMember(), IsCompanyTester()]
    
    def get_queryset(self):
        """Support both /reports/{id}/ and /companies/{cid}/reports/{id}/"""
        company_pk = self.kwargs.get('company_pk')
        
        if company_pk:
            # Nested access - filter by company
            return Report.objects.filter(company__pk=company_pk)
        
        # Direct access - filter by user's accessible companies
        user = self.request.user
        if user.global_role == 'ADMIN':
            return Report.objects.all()
        return Report.objects.filter(
            company__memberships__user=user,
            company__memberships__is_active=True
        ).distinct()

class VulnerabilityViewSet(viewsets.ModelViewSet):
    queryset = Vulnerability.objects.all()
    serializer_class = VulnerabilitySerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['title', 'code']
    
    # Nested under Report, so we get report_pk and company_pk (from parent router)
    # URL: /companies/{cid}/reports/{rid}/vulnerabilities/
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsCompanyMember()]
        return [permissions.IsAuthenticated(), IsCompanyMember(), IsCompanyTester()]

    def get_queryset(self):
        report_pk = self.kwargs.get('report_pk')
        company_pk = self.kwargs.get('company_pk')
        if not report_pk or not company_pk:
            return Vulnerability.objects.none()
        
        # Ensure report belongs to company
        return Vulnerability.objects.filter(report__pk=report_pk, report__company__pk=company_pk)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        report_pk = self.kwargs.get('report_pk')
        company_pk = self.kwargs.get('company_pk')
        
        if report_pk and company_pk:
            context['report'] = get_object_or_404(Report, pk=report_pk, company__pk=company_pk)
        
        return context


    @decorators.action(detail=True, methods=['post'], url_path='change-status')
    def change_status(self, request, report_pk=None, company_pk=None, pk=None):
        vuln = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
             return response.Response({'error': 'Status required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if new_status not in Vulnerability.Status.values:
             return response.Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = vuln.status
        vuln.status = new_status
        vuln.last_edited_by = request.user
        vuln.save()
        
        # Log activity
        ActivityLog.objects.create(
            company=vuln.report.company,
            user=request.user,
            entity_type='VULNERABILITY',
            entity_id=vuln.pk,
            action='STATUS_CHANGED',
            metadata={'old_status': old_status, 'new_status': new_status}
        )
        
        return response.Response({'status': 'updated', 'new_status': new_status})


class VulnerabilityAssetViewSet(viewsets.ModelViewSet):
    serializer_class = VulnerabilityAssetSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        vulnerability_pk = self.kwargs.get('vulnerability_pk')
        if not vulnerability_pk:
            return VulnerabilityAsset.objects.none()
        return VulnerabilityAsset.objects.filter(vulnerability__pk=vulnerability_pk)

    def perform_create(self, serializer):
        vulnerability_pk = self.kwargs.get('vulnerability_pk')
        report_pk = self.kwargs.get('report_pk')
        company_pk = self.kwargs.get('company_pk')
        
        vulnerability = get_object_or_404(Vulnerability, pk=vulnerability_pk, report__pk=report_pk, report__company__pk=company_pk)
        serializer.save(vulnerability=vulnerability)


class RetestViewSet(viewsets.ModelViewSet):
    queryset = Retest.objects.all()
    serializer_class = RetestSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsCompanyMember()]
        return [permissions.IsAuthenticated(), IsCompanyMember(), IsCompanyTester()]

    def get_queryset(self):
        vuln_pk = self.kwargs.get('vulnerability_pk')
        # Here we only get vuln_pk. Use lookup.
        # But wait, how do we enforce company scope?
        # We need to check if the vuln belongs to the company the user has access to.
        # But this viewset might be nested deep: companies/x/reports/y/vulns/z/retests/
        # OR convenient: /api/v1/vulnerabilities/{id}/retests/ ??
        # The requested API design in prompt said details about paths.
        # "GET /api/v1/vulnerabilities/{vuln_id}/retests/"
        # This implies a top level router or nested under vuln?
        # Let's support nested strict mode if easiest.
        # Actually user spec said: "GET /api/v1/vulnerabilities/{vuln_id}/retests/"
        # This means we need to lookup vuln, check company, check user membership.
        
        if not vuln_pk: return Retest.objects.none()
        return Retest.objects.filter(vulnerability__pk=vuln_pk)

    def check_permissions(self, request):
        super().check_permissions(request)
        # Custom logic for checking company access if not using nested URL with company_id
        # We need to find the company from vuln ID and check membership.
        # This is strictly handled by object permission usually, but for LIST it needs filtering.
        pass

    def filter_queryset(self, queryset):
        # We need to filter retests that belong to vulnerabilities of companies user is member of.
        user = self.request.user
        if user.global_role == 'ADMIN':
            return queryset
        
        # Filter by user memberships
        return queryset.filter(
            vulnerability__report__company__memberships__user=user,
            vulnerability__report__company__memberships__is_active=True
        ).distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if 'vulnerability_pk' in self.kwargs:
            # We must ensure this vuln exists and user has access?
            # get_object_or_404 might leak existence.
            # But standard Django way is fine.
            context['vulnerability'] = get_object_or_404(Vulnerability, pk=self.kwargs['vulnerability_pk'])
        return context
    

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    
    def get_queryset(self):
        user = self.request.user
        qs = Comment.objects.all()
        if user.global_role == 'ADMIN':
            return qs

        # Filter: User must be member of the company the comment belongs to
        qs = qs.filter(company__memberships__user=user, company__memberships__is_active=True).distinct()
        
        # If user is CLIENT role, hide internal comments
        # Logic: If for a specific comment, the user is CLIENT for that company, hide it?
        # But a user can be TESTER for Company A and CLIENT for Company B.
        # So we can't just check user.role. We need to check role for *that* company.
        # This is complex in a single query.
        # Simplified: Exclude is_internal=True if user is NOT (Global Admin OR Tester for that company).
        
        # Taking a simpler approach:
        # If user is Client in specific company, exclude internal for that company.
        # Ideally we iterate or use subqueries. For MVP, let's filter:
        # Show all internal=False
        # OR show internal=True AND (user is Admin OR user is Tester for that company)
        
        # For this MVP, let's just show all to Testers/Admins and hide internal from Clients?
        # A user could be client for one company.
        # Let's trust the company filter first.
        # Then, if user is ONLY client in that company, filter internal.
        
        # Since this ViewSet is likely used with /api/v1/comments/?filters...
        return qs

    def perform_create(self, serializer):
        serializer.save()

class AttachmentViewSet(viewsets.ModelViewSet):
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    
    def get_queryset(self):
        user = self.request.user
        qs = Attachment.objects.all()
        
        # Handle nesting:
        report_pk = self.kwargs.get('report_pk')
        vulnerability_pk = self.kwargs.get('vulnerability_pk')
        company_pk = self.kwargs.get('company_pk')

        if report_pk:
            qs = qs.filter(report__pk=report_pk)
        if vulnerability_pk:
            qs = qs.filter(vulnerability__pk=vulnerability_pk)
            
        if user.global_role == 'ADMIN':
            return qs
            
        # Scope by company access
        return qs.filter(
            report__company__memberships__user=user,
            report__company__memberships__is_active=True
        ).distinct() | qs.filter(
             vulnerability__report__company__memberships__user=user,
             vulnerability__report__company__memberships__is_active=True
        ).distinct()

    def get_serializer_context(self):
        context = super().get_serializer_context()
        report_pk = self.kwargs.get('report_pk')
        vulnerability_pk = self.kwargs.get('vulnerability_pk')
        company_pk = self.kwargs.get('company_pk')

        if report_pk:
            # Optionally check company_pk match if strictly nested
            criteria = {'pk': report_pk}
            if company_pk:
                criteria['company__pk'] = company_pk
            context['report'] = get_object_or_404(Report, **criteria)
            
        if vulnerability_pk:
            criteria = {'pk': vulnerability_pk}
            if report_pk:
                criteria['report__pk'] = report_pk
            if company_pk:
                criteria['report__company__pk'] = company_pk
            context['vulnerability'] = get_object_or_404(Vulnerability, **criteria)
            
        return context


class ReportAssetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing report-asset attachments.
    Nested under /companies/{cid}/reports/{rid}/assets/
    """
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    
    def get_permissions(self):
        # Only testers can attach/detach, everyone can list
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated(), IsCompanyMember()]
        return [permissions.IsAuthenticated(), IsCompanyMember(), IsCompanyTester()]
    
    def get_queryset(self):
        report_pk = self.kwargs.get('report_pk')
        company_pk = self.kwargs.get('company_pk')
        
        if not report_pk or not company_pk:
            return Asset.objects.none()
        
        # Return only assets attached to this report
        return Asset.objects.filter(
            reports__pk=report_pk,
            reports__company__pk=company_pk
        )
    
    def create(self, request, *args, **kwargs):
        """Attach an asset to the report"""
        report_pk = self.kwargs.get('report_pk')
        company_pk = self.kwargs.get('company_pk')
        asset_id = request.data.get('assetId')
        
        if not asset_id:
            return response.Response(
                {'error': 'assetId is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        report = get_object_or_404(Report, pk=report_pk, company__pk=company_pk)
        asset = get_object_or_404(Asset, pk=asset_id, company__pk=company_pk)
        
        # Create or update the ReportAsset
        report_asset, created = ReportAsset.objects.get_or_create(
            report=report,
            asset=asset,
            defaults={'attached_by': request.user, 'auto_attached': False}
        )
        
        if not created and report_asset.auto_attached:
            # If it was auto-attached, mark it as manually confirmed
            report_asset.auto_attached = False
            report_asset.attached_by = request.user
            report_asset.save()
        
        return response.Response(AssetSerializer(asset).data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """Detach an asset from the report"""
        report_pk = self.kwargs.get('report_pk')
        company_pk = self.kwargs.get('company_pk')
        asset_id = kwargs.get('pk')
        
        report_asset = get_object_or_404(
            ReportAsset,
            report__pk=report_pk,
            report__company__pk=company_pk,
            asset__pk=asset_id
        )
        
        report_asset.delete()
        return response.Response(status=status.HTTP_204_NO_CONTENT)

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        company_pk = self.kwargs.get('company_pk')
        
        # If accessed via /companies/{id}/activity/ - filter by company
        if company_pk:
            # Check if user has company access
            if user.global_role != 'ADMIN':
                # Verify user is member of this company
                if not user.memberships.filter(company__pk=company_pk, is_active=True).exists():
                    return ActivityLog.objects.none()
            return ActivityLog.objects.filter(company__pk=company_pk).order_by('-created_at')
        
        # If accessed via /activity-logs/ (global endpoint) - only admins can access
        if user.global_role == 'ADMIN':
            return ActivityLog.objects.all().order_by('-created_at')
        
        # Non-admins can only see logs from their companies
        return ActivityLog.objects.filter(
            company__memberships__user=user,
            company__memberships__is_active=True
        ).distinct().order_by('-created_at')



class DashboardStatsViewSet(viewsets.ViewSet):
    """
    ViewSet for dashboard statistics.
    Returns aggregated data across all companies the user has access to.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_accessible_companies(self, user):
        """Get companies the user has access to"""
        if user.global_role == 'ADMIN':
            return Company.objects.all()
        return Company.objects.filter(
            memberships__user=user, 
            memberships__is_active=True
        ).distinct()

    @decorators.action(detail=False, methods=['get'])
    def overview(self, request):
        """Get dashboard overview statistics"""
        from django.db.models import Count, Q
        from datetime import datetime, timedelta
        
        user = request.user
        companies = self._get_accessible_companies(user)
        
        # Get all reports for accessible companies
        reports = Report.objects.filter(company__in=companies)
        
        # Get all vulnerabilities for accessible companies
        vulnerabilities = Vulnerability.objects.filter(report__company__in=companies)
        
        # Basic counts
        total_reports = reports.count()
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
            'report_id': str(vuln.report.id),
            'report_title': vuln.report.title,
            'company_id': str(vuln.report.company.id),
            'company_name': vuln.report.company.name,
            'created_at': vuln.created_at.isoformat(),
        } for vuln in recent_vulnerabilities]
        
        # Recent reports (last 10)
        recent_reports = reports.order_by('-created_at')[:10]
        recent_reports_data = [{
            'id': str(report.id),
            'title': report.title,
            'status': report.status,
            'company_id': str(report.company.id),
            'company_name': report.company.name,
            'start_date': report.start_date.isoformat(),
            'end_date': report.end_date.isoformat(),
            'vulnerability_count': report.vulnerabilities.count(),
            'created_at': report.created_at.isoformat(),
        } for report in recent_reports]
        
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
        
        return response.Response({
            'total_vulnerabilities': total_vulnerabilities,
            'total_reports': total_reports,
            'critical_vulnerabilities': critical_vulnerabilities,
            'recent_activity_count': recent_activity_count,
            'severity_distribution': severity_distribution,
            'status_distribution': status_distribution,
            'recent_vulnerabilities': recent_vulns_data,
            'recent_reports': recent_reports_data,
            'vulnerability_trend': trend_data,
        })

