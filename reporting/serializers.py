from rest_framework import serializers
from .models import (
    User, Company, CompanyMembership,
    Asset, Report, Vulnerability, VulnerabilityAsset, Retest, Comment, Attachment, ActivityLog, ReportAsset
)

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'global_role', 'is_active', 'password']
        read_only_fields = ['id']
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class CompanySerializer(serializers.ModelSerializer):
    report_count = serializers.SerializerMethodField()
    asset_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'contact_email', 'address', 'notes', 'is_active', 'created_at', 'updated_at', 'report_count', 'asset_count']
    
    def get_report_count(self, obj):
        return obj.reports.count()
    
    def get_asset_count(self, obj):
        return obj.assets.count()

class CompanyMembershipSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(write_only=True)
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = CompanyMembership
        fields = ['id', 'company', 'user', 'user_email', 'role', 'title', 'is_active']
        read_only_fields = ['company', 'user']

    def create(self, validated_data):
        email = validated_data.pop('user_email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"user_email": "User with this email does not exist."})
        
        # company should be passed in context or save method
        company = self.context.get('company')
        if not company:
             raise serializers.ValidationError("Company context required.")

        membership = CompanyMembership.objects.create(user=user, company=company, **validated_data)
        return membership

class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = ['id', 'company', 'name', 'type', 'identifier', 'environment', 'description', 
                  'is_active', 'created_at', 'updated_at']
        read_only_fields = ['company']

    def create(self, validated_data):
        company = self.context.get('company')
        if not company:
            raise serializers.ValidationError("Company context required.")
        return Asset.objects.create(company=company, **validated_data)

class ReportSerializer(serializers.ModelSerializer):
    assets = AssetSerializer(many=True, read_only=True)
    
    class Meta:
        model = Report
        fields = ['id', 'company', 'title', 'engagement_type', 'summary', 'scope_description', 
                  'start_date', 'end_date', 'status', 'assets', 'created_by', 'last_edited_by', 
                  'created_at', 'updated_at']
        read_only_fields = ['company', 'created_by', 'last_edited_by']

    def create(self, validated_data):
        company = self.context.get('company')
        user = self.context['request'].user
        if not company:
            raise serializers.ValidationError("Company context required.")
        return Report.objects.create(company=company, created_by=user, last_edited_by=user, **validated_data)
    
    def update(self, instance, validated_data):
        user = self.context['request'].user
        validated_data['last_edited_by'] = user
        return super().update(instance, validated_data)

class VulnerabilitySerializer(serializers.ModelSerializer):
    assets = AssetSerializer(many=True, read_only=True)
    
    class Meta:
        model = Vulnerability
        fields = ['id', 'report', 'title', 'severity', 'status', 'cvss_base_score', 
                  'cvss_vector', 'details_md', 'references', 'assets', 'created_by', 
                  'last_edited_by', 'created_at', 'updated_at']
        read_only_fields = ['report', 'created_by', 'last_edited_by']
    
    def create(self, validated_data):
        report = self.context.get('report')
        user = self.context['request'].user
        if not report:
            raise serializers.ValidationError("Report context required.")
        return Vulnerability.objects.create(
            report=report,
            created_by=user,
            last_edited_by=user,
            **validated_data
        )
    def update(self, instance, validated_data):
        user = self.context['request'].user
        validated_data['last_edited_by'] = user
        return super().update(instance, validated_data)

class RetestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Retest
        fields = ['id', 'vulnerability', 'retest_date', 'performed_by', 'status', 'notes_md', 'created_at', 'updated_at']
        read_only_fields = ['vulnerability', 'performed_by']

    def create(self, validated_data):
        vulnerability = self.context.get('vulnerability')
        user = self.context['request'].user
        if not vulnerability:
            raise serializers.ValidationError("Vulnerability context required.")
        return Retest.objects.create(vulnerability=vulnerability, performed_by=user, **validated_data)

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
    class Meta:
        model = Comment
        fields = ['id', 'company', 'report', 'vulnerability', 'retest', 'author', 'body_md', 
                  'is_internal', 'created_at', 'updated_at']
        read_only_fields = ['company', 'author', 'report', 'vulnerability', 'retest']

    def create(self, validated_data):
        user = self.context['request'].user
        company = self.context.get('company')
        if not company:
            raise serializers.ValidationError("Company context required.")
            
        validated_data['author'] = user
        validated_data['company'] = company
        
        # Linking logic handled in viewset usually, but here just robust defaults
        if 'report' in self.context: validated_data['report'] = self.context['report']
        if 'vulnerability' in self.context: validated_data['vulnerability'] = self.context['vulnerability']
        if 'retest' in self.context: validated_data['retest'] = self.context['retest']

        return super().create(validated_data)

class AttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attachment
        fields = ['id', 'report', 'vulnerability', 'file', 'file_name', 'description', 'uploaded_by', 'uploaded_at']
        read_only_fields = ['report', 'vulnerability', 'uploaded_by']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['uploaded_by'] = user
        
        if 'report' in self.context: validated_data['report'] = self.context['report']
        if 'vulnerability' in self.context: validated_data['vulnerability'] = self.context['vulnerability']
        
        return super().create(validated_data)

class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ['id', 'company', 'user', 'entity_type', 'entity_id', 'action', 'metadata', 'created_at']
