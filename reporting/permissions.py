from rest_framework import permissions
from .models import CompanyMembership

class IsGlobalAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.global_role == 'ADMIN'

class IsCompanyMember(permissions.BasePermission):
    """
    Checks if user is a member of the company accessed in the URL.
    Usually company_id is in kwargs.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.global_role == 'ADMIN':
            return True

        company_id = view.kwargs.get('company_pk') or view.kwargs.get('pk')
        # If no company_id in URL, this permission might not be applicable or 
        # the view handles listing which is filtered by queryset.
        if not company_id:
            return True
        
        return CompanyMembership.objects.filter(
            user=request.user,
            company__pk=company_id,
            is_active=True
        ).exists()

class IsCompanyTester(permissions.BasePermission):
    """
    Allows write access only to Testers of the specific company.
    """
    def has_permission(self, request, view):
        # Read permissions are handled by IsCompanyMember + ReadOnly/etc.
        # This specifically protects unsafe methods.
        if request.method in permissions.SAFE_METHODS:
            return True
            
        if not request.user.is_authenticated:
            return False

        if request.user.global_role == 'ADMIN':
            return True

        company_id = view.kwargs.get('company_pk')
        if not company_id:
             # Try to find company from object if detail view
             return True

        return CompanyMembership.objects.filter(
            user=request.user,
            company__pk=company_id,
            role=CompanyMembership.Role.TESTER,
            is_active=True
        ).exists()
    
    def has_object_permission(self, request, view, obj):
        if request.user.global_role == 'ADMIN':
            return True
            
        # Assuming obj has .company attribute
        if not hasattr(obj, 'company'):
            return False

        return CompanyMembership.objects.filter(
            user=request.user,
            company=obj.company,
            role=CompanyMembership.Role.TESTER,
            is_active=True
        ).exists()
