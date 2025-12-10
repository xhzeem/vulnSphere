from django.urls import path, include
from rest_framework_nested import routers
from .views import (
    UserViewSet, CompanyViewSet, CompanyMembershipViewSet,
    AssetViewSet, ReportViewSet, VulnerabilityViewSet, VulnerabilityAssetViewSet, RetestViewSet, 
    CommentViewSet, AttachmentViewSet, ActivityLogViewSet, ReportAssetViewSet, DashboardStatsViewSet
)

# We need to hook into the main router or creating a new one.
# The core router handles /companies. We need to attach to that.

# Since `core` has the main /companies route, we should probably define the nested structure there OR import the router here.
# But separating apps is cleaner.
# Let's define a new router that registers 'companies' again? No, duplicate.
# We will use the router from core? Or just manually define nested routers here based on 'companies' lookup.

# Better: Just define the full nested structure here with a "dummy" parent or just use the prefix.
# However, to use `rest_framework_nested`, we need the parent router.
# Let's create a router that assumes 'companies' exists or register it here too.
# But Core owns Companies.

# Solution:
# We will create a router here, register 'companies' (using Core's viewset/serializer just for routing reference? or empty?).
# Actually, we can just import the CompanyViewSet.

router = routers.DefaultRouter()
# User management
router.register(r'users', UserViewSet)
# Global endpoints
router.register(r'comments', CommentViewSet)
# Dashboard stats
router.register(r'dashboard', DashboardStatsViewSet, basename='dashboard')
# Attachments might be nested or global? Let's generic global with filters?
# The spec said: GET /api/v1/reports/{report_id}/attachments/
# So we need nested routers.

# Companies router
router.register(r'companies', CompanyViewSet)

companies_router = routers.NestedDefaultRouter(router, r'companies', lookup='company')
companies_router.register(r'memberships', CompanyMembershipViewSet, basename='company-memberships')
companies_router.register(r'assets', AssetViewSet, basename='company-assets')
companies_router.register(r'reports', ReportViewSet, basename='company-reports')
companies_router.register(r'activity', ActivityLogViewSet, basename='company-activity')

# Reports router (nested under companies)
reports_router = routers.NestedDefaultRouter(companies_router, r'reports', lookup='report')
reports_router.register(r'vulnerabilities', VulnerabilityViewSet, basename='report-vulnerabilities')
reports_router.register(r'assets', ReportAssetViewSet, basename='report-assets')
# reports/{id}/attachments
reports_router.register(r'attachments', AttachmentViewSet, basename='report-attachments')

# Vulnerabilities router (nested under reports, which is nested under companies)
# Wait, this gets deep. /companies/{c}/reports/{r}/vulnerabilities/{v}/retests
# The spec asked for: /api/v1/vulnerabilities/{vuln_id}/retests/
# This is a shorter path.

# Let's implement the specific paths requested in the prompt using "Shortcuts".
vulnerability_router = routers.DefaultRouter()
vulnerability_router.register(r'vulnerabilities', VulnerabilityViewSet) 
# Note: VulnerabilityViewSet needs to handle being called without report_pk/company_pk if we expose it at top level?
# But we defined it to require parents.
# The prompt said: `GET /api/v1/vulnerabilities/{vuln_id}/retests/`
# This implies Vulnerability is a first-class citizen in the URL space too?
# Or we can nest Retests under Vulnerability at the top level.

# To support `GET /api/v1/vulnerabilities/{vuln_id}/retests/`:
# We need a router for 'vulnerabilities'.
# But VulnerabilityViewSet was written to expect nesting under Report.
# We can modify VulnerabilityViewSet or make a new ViewSet or generic one.
# For simplicity, let's just make RetestViewSet available at /vulnerabilities/{id}/retests
# We can register the VulnerabilityViewSet at root '/vulnerabilities' strictly for lookup?
# But `IsCompanyMember` needs context.

# Let's stick to the Nested structure for primary access as it guarantees company scope easiest.
# And add the specific shortcuts requested.

short_vuln_router = routers.DefaultRouter()
short_vuln_router.register(r'vulnerabilities', VulnerabilityViewSet) # This might return 404/Empty if code strictly checks parents

# Let's stick to the deep nesting first as it's most robust for multi-tenancy.
# user spec: /api/v1/companies/{company_id}/reports/{report_id}/vulnerabilities/
# AND /api/v1/vulnerabilities/{vuln_id}/retests/

# I'll create a dedicated simple router for the shortcuts, but I might need to adjust Views to handle "No Parent in URL".
# I'll modify the View to check: if parent in URL -> filter by parent. Else -> filter by just the object logic?

# For now, implementing the Deep Structure.
vulns_router = routers.NestedDefaultRouter(reports_router, r'vulnerabilities', lookup='vulnerability')
vulns_router.register(r'assets', VulnerabilityAssetViewSet, basename='vulnerability-assets')
vulns_router.register(r'retests', RetestViewSet, basename='vulnerability-retests')
vulns_router.register(r'attachments', AttachmentViewSet, basename='vulnerability-attachments')

# Add standalone reports router for direct report access
router.register(r'reports', ReportViewSet, basename='reports')

# Add global activity logs endpoint (admin only)
router.register(r'activity-logs', ActivityLogViewSet, basename='activity-logs')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(companies_router.urls)),
    path('', include(reports_router.urls)),
    path('', include(vulns_router.urls)),
]
