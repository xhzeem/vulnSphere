from django.contrib import admin
from .models import (
    User, Company, CompanyMembership, Asset, Report, 
    Vulnerability, VulnerabilityAsset, Retest, 
    Comment, Attachment, ActivityLog, ReportAsset
)

# Register your models here.
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'global_role', 'is_active')
    list_filter = ('global_role', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')

@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'contact_email', 'is_active', 'created_at')
    search_fields = ('name', 'slug', 'contact_email')
    list_filter = ('is_active', 'created_at')

@admin.register(CompanyMembership)
class CompanyMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'company', 'role', 'is_active')
    list_filter = ('role', 'is_active', 'company')
    search_fields = ('user__email', 'company__name')

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('name', 'company', 'type', 'identifier', 'environment', 'is_active')
    list_filter = ('type', 'environment', 'is_active', 'company')
    search_fields = ('name', 'identifier')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'engagement_type', 'status', 'start_date', 'end_date')
    list_filter = ('status', 'company')
    search_fields = ('title', 'company__name')

@admin.register(Vulnerability)
class VulnerabilityAdmin(admin.ModelAdmin):
    list_display = ('title', 'report', 'severity', 'status', 'created_at')
    list_filter = ('severity', 'status', 'report__company')
    search_fields = ('title', 'report__title')

@admin.register(VulnerabilityAsset)
class VulnerabilityAssetAdmin(admin.ModelAdmin):
    list_display = ('vulnerability', 'asset')
    search_fields = ('vulnerability__title', 'asset__name')

@admin.register(ReportAsset)
class ReportAssetAdmin(admin.ModelAdmin):
    list_display = ('report', 'asset', 'auto_attached', 'attached_at')
    list_filter = ('auto_attached',)
    search_fields = ('report__title', 'asset__name')

@admin.register(Retest)
class RetestAdmin(admin.ModelAdmin):
    list_display = ('vulnerability', 'status', 'retest_date', 'performed_by')
    list_filter = ('status', 'retest_date')

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('author', 'company', 'is_internal', 'created_at')
    list_filter = ('is_internal', 'company', 'created_at')

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('file_name', 'uploaded_by', 'uploaded_at', 'report', 'vulnerability')
    list_filter = ('uploaded_at',)

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'entity_type', 'company', 'created_at')
    list_filter = ('action', 'entity_type', 'company')
    search_fields = ('user__email', 'company__name')
