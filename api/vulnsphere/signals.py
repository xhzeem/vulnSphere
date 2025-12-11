from django.db.models.signals import post_save, post_migrate, post_delete
from django.dispatch import receiver
from .models import VulnerabilityAsset, ProjectAsset, ActivityLog, Company, Project, Vulnerability, Asset, Comment, User
import threading


@receiver(post_save, sender=VulnerabilityAsset)
def auto_attach_asset_to_project(sender, instance, created, **kwargs):
    """
    Automatically attach assets to projects when a vulnerability references them.
    """
    if created:
        # Create ProjectAsset if it doesn't exist
        ProjectAsset.objects.get_or_create(
            project=instance.vulnerability.project,
            asset=instance.asset,
            defaults={'auto_attached': True}
        )

@receiver(post_migrate)
def create_default_admin(sender, **kwargs):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    if sender.name == 'vulnsphere':
        if not User.objects.filter(role='ADMIN').exists():
            print("Creating default admin user...")
            User.objects.create_superuser(
                email='admin@example.com',
                password='password',
                username='admin',
                name='Default Admin',
                role='ADMIN'
            )
            print("Default admin created: admin@example.com / password")


# Thread-local storage for current user
_thread_locals = threading.local()

def get_current_user():
    """Get the current user from thread-local storage"""
    return getattr(_thread_locals, 'user', None)

def set_current_user(user):
    """Set the current user in thread-local storage"""
    _thread_locals.user = user

def clear_current_user():
    """Clear the current user from thread-local storage"""
    if hasattr(_thread_locals, 'user'):
        del _thread_locals.user


# Activity Logging Signal Handlers

@receiver(post_save, sender=Company)
def log_company_activity(sender, instance, created, **kwargs):
    """Log Company CREATE and UPDATE"""
    action = 'CREATED' if created else 'UPDATED'
    
    ActivityLog.objects.create(
        company=instance,
        user=get_current_user(),
        entity_type='COMPANY',
        entity_id=instance.pk,
        action=action,
        metadata={'name': instance.name}
    )


@receiver(post_save, sender=Project)
def log_project_activity(sender, instance, created, **kwargs):
    """Log Project CREATE and UPDATE"""
    action = 'CREATED' if created else 'UPDATED'
    
    ActivityLog.objects.create(
        company=instance.company,
        user=get_current_user(),
        entity_type='PROJECT',
        entity_id=instance.pk,
        action=action,
        metadata={
            'title': instance.title,
            'status': instance.status
        }
    )


@receiver(post_delete, sender=Project)
def log_project_delete(sender, instance, **kwargs):
    """Log Project DELETE"""
    ActivityLog.objects.create(
        company=instance.company,
        user=get_current_user(),
        entity_type='PROJECT',
        entity_id=instance.pk,
        action='DELETED',
        metadata={'title': instance.title}
    )


@receiver(post_save, sender=Vulnerability)
def log_vulnerability_activity(sender, instance, created, **kwargs):
    """Log Vulnerability CREATE and UPDATE"""
    # Skip if this is just a status change (already logged separately in views.py)
    if not created and kwargs.get('update_fields') and 'status' in kwargs.get('update_fields', []):
        return
    
    action = 'CREATED' if created else 'UPDATED'
    
    ActivityLog.objects.create(
        company=instance.project.company,
        user=get_current_user(),
        entity_type='VULNERABILITY',
        entity_id=instance.pk,
        action=action,
        metadata={
            'title': instance.title,
            'severity': instance.severity,
            'status': instance.status,
            'project_id': str(instance.project.pk)
        }
    )


@receiver(post_delete, sender=Vulnerability)
def log_vulnerability_delete(sender, instance, **kwargs):
    """Log Vulnerability DELETE"""
    ActivityLog.objects.create(
        company=instance.project.company,
        user=get_current_user(),
        entity_type='VULNERABILITY',
        entity_id=instance.pk,
        action='DELETED',
        metadata={
            'title': instance.title,
            'project_id': str(instance.project.pk)
        }
    )


@receiver(post_save, sender=Asset)
def log_asset_activity(sender, instance, created, **kwargs):
    """Log Asset CREATE and UPDATE"""
    action = 'CREATED' if created else 'UPDATED'
    
    ActivityLog.objects.create(
        company=instance.company,
        user=get_current_user(),
        entity_type='ASSET',
        entity_id=instance.pk,
        action=action,
        metadata={
            'name': instance.name,
            'type': instance.type
        }
    )


@receiver(post_delete, sender=Asset)
def log_asset_delete(sender, instance, **kwargs):
    """Log Asset DELETE"""
    ActivityLog.objects.create(
        company=instance.company,
        user=get_current_user(),
        entity_type='ASSET',
        entity_id=instance.pk,
        action='DELETED',
        metadata={'name': instance.name}
    )


@receiver(post_save, sender=Comment)
def log_comment_activity(sender, instance, created, **kwargs):
    """Log Comment CREATE (updates are less important)"""
    if not created:
        return
    
    ActivityLog.objects.create(
        company=instance.company,
        user=get_current_user(),
        entity_type='COMMENT',
        entity_id=instance.pk,
        action='CREATED',
        metadata={
            'author_id': str(instance.author.pk) if instance.author else None,
            'project_id': str(instance.project.pk) if instance.project else None,
            'vulnerability_id': str(instance.vulnerability.pk) if instance.vulnerability else None
        }
    )


@receiver(post_delete, sender=Comment)
def log_comment_delete(sender, instance, **kwargs):
    """Log Comment DELETE"""
    ActivityLog.objects.create(
        company=instance.company,
        user=get_current_user(),
        entity_type='COMMENT',
        entity_id=instance.pk,
        action='DELETED',
        metadata={
            'author_id': str(instance.author.pk) if instance.author else None
        }
    )


@receiver(post_save, sender=User)
def log_user_activity(sender, instance, created, **kwargs):
    """Log User CREATE - don't log updates to avoid noise from login/profile changes"""
    if not created:
        return
    
    # For user creation, log to all their companies
    for company in instance.companies.all():
        ActivityLog.objects.create(
            company=company,
            user=get_current_user(),
            entity_type='USER',
            entity_id=instance.pk,
            action='CREATED',
            metadata={
                'username': instance.username,
                'role': instance.role
            }
        )
