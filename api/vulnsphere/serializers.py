from rest_framework import serializers
from .models import (
    User, Company,
    Asset, Project, Vulnerability, VulnerabilityAsset, Retest, Comment, Attachment, ActivityLog, ProjectAsset,
    ReportTemplate, GeneratedReport, VulnerabilityTemplate
)

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'name', 'role', 'companies', 'is_active', 'password']
        read_only_fields = ['id']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def validate_username(self, value):
        # Validate username format: alphanumeric and underscores only, 3-50 chars
        import re
        if not re.match(r'^[a-zA-Z0-9_]{3,50}$', value):
            raise serializers.ValidationError(
                "Username must be 3-50 characters and contain only letters, numbers, and underscores."
            )
        return value
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        companies = validated_data.pop('companies', [])
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        if companies:
            user.companies.set(companies)
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        companies = validated_data.pop('companies', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        if password:
            instance.set_password(password)
        instance.save()
        
        if companies is not None:
            instance.companies.set(companies)
            
        return instance

class CompanySerializer(serializers.ModelSerializer):
    project_count = serializers.SerializerMethodField()
    asset_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'contact_email', 'address', 'notes', 'is_active', 'created_at', 'updated_at', 'project_count', 'asset_count']
        extra_kwargs = {
            'contact_email': {'required': False, 'allow_null': True, 'allow_blank': True}
        }
    
    def get_project_count(self, obj):
        return obj.projects.count()
    
    def get_asset_count(self, obj):
        return obj.assets.count()

# CompanyMembershipSerializer removed - users now have global roles

class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = ['id', 'company', 'name', 'type', 'identifier', 'description', 
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['company']

    def create(self, validated_data):
        company = self.context.get('company')
        if not company:
            raise serializers.ValidationError("Company context required.")
        return Asset.objects.create(company=company, **validated_data)

class ProjectSerializer(serializers.ModelSerializer):
    assets = AssetSerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'company', 'title', 'engagement_type', 'summary', 'scope_description', 
                  'start_date', 'end_date', 'status', 'assets', 'created_by', 'last_edited_by', 
                  'created_at', 'updated_at']
        read_only_fields = ['company', 'created_by', 'last_edited_by']

    def create(self, validated_data):
        company = self.context.get('company')
        user = self.context['request'].user
        if not company:
            raise serializers.ValidationError("Company context required.")
        return Project.objects.create(company=company, created_by=user, last_edited_by=user, **validated_data)
    
    def update(self, instance, validated_data):
        user = self.context['request'].user
        validated_data['last_edited_by'] = user
        return super().update(instance, validated_data)

class VulnerabilitySerializer(serializers.ModelSerializer):
    assets = AssetSerializer(many=True, read_only=True)
    
    class Meta:
        model = Vulnerability
        fields = ['id', 'project', 'title', 'severity', 'status', 'cvss_base_score', 
                  'cvss_vector', 'details_md', 'references', 'assets', 'created_by', 
                  'last_edited_by', 'created_at', 'updated_at']
        read_only_fields = ['project', 'created_by', 'last_edited_by']
    
    def create(self, validated_data):
        project = self.context.get('project')
        user = self.context['request'].user
        if not project:
            raise serializers.ValidationError("Project context required.")
        return Vulnerability.objects.create(
            project=project,
            created_by=user,
            last_edited_by=user,
            **validated_data
        )
    def update(self, instance, validated_data):
        user = self.context['request'].user
        validated_data['last_edited_by'] = user
        return super().update(instance, validated_data)

class RetestSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Retest
        fields = ['id', 'vulnerability', 'retest_date', 'performed_by', 'performed_by_name', 
                  'requested_by', 'requested_by_name', 'request_type', 'status', 'notes_md', 
                  'created_at', 'updated_at']
        read_only_fields = ['vulnerability', 'performed_by', 'requested_by']
    
    def get_performed_by_name(self, obj):
        return obj.performed_by.name if obj.performed_by else None
    
    def get_requested_by_name(self, obj):
        return obj.requested_by.name if obj.requested_by else None

    def create(self, validated_data):
        vulnerability = self.context.get('vulnerability')
        user = self.context['request'].user
        if not vulnerability:
            raise serializers.ValidationError("Vulnerability context required.")
        
        request_type = validated_data.get('request_type', 'INITIAL')
        
        # Auto-set requested_by for REQUEST type
        if request_type == 'REQUEST':
            validated_data['requested_by'] = user
        
        # Auto-set performed_by for RETEST type
        if request_type == 'RETEST':
            validated_data['performed_by'] = user
        
        retest = Retest.objects.create(vulnerability=vulnerability, **validated_data)
        return retest


class VulnerabilityAssetSerializer(serializers.ModelSerializer):
    asset_details = AssetSerializer(source='asset', read_only=True)
    
    class Meta:
        model = VulnerabilityAsset
        fields = ['id', 'vulnerability', 'asset', 'asset_details', 'notes_md']
        read_only_fields = ['vulnerability']
    
    def create(self, validated_data):
        vulnerability = validated_data.get('vulnerability') or self.context.get('vulnerability')
        if not vulnerability:
            raise serializers.ValidationError("Vulnerability context required.")
        # Only pass validation_data (vulnerability is already in it if it came from save kwargs, 
        # but if it came from context we might need to add it? 
        # Actually validated_data contains 'vulnerability' if passed to save(). 
        # But if it came from context it's NOT in validated_data naturally unless added.
        # So we should be explicit in create argument.)
        
        # If vulnerability came from context, add it to creation kwargs
        if 'vulnerability' not in validated_data and vulnerability:
            validated_data['vulnerability'] = vulnerability
            
        return VulnerabilityAsset.objects.create(**validated_data)


class CommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.name', read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'company', 'project', 'vulnerability', 'retest', 'author', 'author_name', 
                  'body_md', 'is_internal', 'created_at', 'updated_at']
        read_only_fields = ['author', 'author_name']

    def create(self, validated_data):
        # Author is set from request user
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'project', 'vulnerability', 'file', 'file_name', 'description', 'uploaded_by', 'uploaded_at']
        read_only_fields = ['project', 'vulnerability', 'uploaded_by']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['uploaded_by'] = user
        
        if 'project' in self.context: validated_data['project'] = self.context['project']
        if 'vulnerability' in self.context: validated_data['vulnerability'] = self.context['vulnerability']
        
        return super().create(validated_data)

class ActivityLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'company', 'company_name', 'user', 'user_name', 'entity_type', 'entity_id', 'action', 'metadata', 'created_at']

class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = ['id', 'name', 'description', 'file', 'created_at', 'updated_at']

class VulnerabilityTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = VulnerabilityTemplate
        fields = ['id', 'title', 'severity', 'cvss_base_score', 'cvss_vector', 'details_md', 'references', 'created_at', 'updated_at']
        read_only_fields = ['created_by']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        return super().create(validated_data)

class GeneratedReportSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = GeneratedReport
        fields = ['id', 'project', 'company', 'template', 'template_name', 'project_title', 'company_name', 
                  'file', 'format', 'is_failed', 'error_message', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'is_failed', 'error_message', 'file', 'template_name', 'project_title', 'company_name']

class ReportGenerationRequestSerializer(serializers.Serializer):
    template_id = serializers.UUIDField()
    project_id = serializers.UUIDField(required=False, allow_null=True)
    company_id = serializers.UUIDField(required=False, allow_null=True)

    def validate(self, attrs):
        if not attrs.get('project_id') and not attrs.get('company_id'):
            raise serializers.ValidationError("Either project_id or company_id must be provided.")
        if attrs.get('project_id') and attrs.get('company_id'):
             raise serializers.ValidationError("Specify only one scope (project or company), not both.")
        return attrs
