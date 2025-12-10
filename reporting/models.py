from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.conf import settings
import uuid

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('The Email must be set'))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class GlobalRole(models.TextChoices):
        ADMIN = 'ADMIN', _('Global Admin')
        NONE = 'NONE', _('Standard User')

    username = None
    email = models.EmailField(_('email address'), unique=True)
    global_role = models.CharField(
        max_length=10,
        choices=GlobalRole.choices,
        default=GlobalRole.NONE,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']
    
    objects = CustomUserManager()

    def __str__(self):
        return self.email

class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    contact_email = models.EmailField()
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class CompanyMembership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Role(models.TextChoices):
        TESTER = 'TESTER', _('Tester')
        CLIENT = 'CLIENT', _('Client')

    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='memberships')
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    title = models.CharField(max_length=100, blank=True)
    
    class Meta:
        unique_together = ('user', 'company', 'role')

    def __str__(self):
        return f"{self.user} - {self.company} ({self.role})"

class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Type(models.TextChoices):
        WEB_APP = 'WEB_APP', 'Web Application'
        SERVER = 'SERVER', 'Server'
        API = 'API', 'API'
        MOBILE_APP = 'MOBILE_APP', 'Mobile Application'
        NETWORK_DEVICE = 'NETWORK_DEVICE', 'Network Device'
        OTHER = 'OTHER', 'Other'

    class Environment(models.TextChoices):
        PRODUCTION = 'PRODUCTION', 'Production'
        STAGING = 'STAGING', 'Staging'
        DEVELOPMENT = 'DEVELOPMENT', 'Development'
        TEST = 'TEST', 'Test'
        OTHER = 'OTHER', 'Other'

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='assets')
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=Type.choices)
    identifier = models.CharField(max_length=255)
    environment = models.CharField(max_length=20, choices=Environment.choices, blank=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.company.name})"

class ReportAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    """
    Through model to track which assets are attached to which reports.
    Assets can be auto-attached when referenced by a vulnerability or manually attached.
    """
    report = models.ForeignKey('Report', on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    auto_attached = models.BooleanField(default=False, help_text="Whether this was auto-attached via vulnerability")
    attached_at = models.DateTimeField(auto_now_add=True)
    attached_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        unique_together = ('report', 'asset')
    
    def __str__(self):
        return f"{self.asset.name} -> {self.report.title}"

class Report(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        IN_REVIEW = 'IN_REVIEW', 'In Review'
        FINAL = 'FINAL', 'Final'
        ARCHIVED = 'ARCHIVED', 'Archived'

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='reports')
    title = models.CharField(max_length=255)
    engagement_type = models.CharField(max_length=100)
    summary = models.TextField(blank=True)
    scope_description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='authored_reports')
    last_edited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='edited_reports')
    assets = models.ManyToManyField(Asset, through='ReportAsset', related_name='reports')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Vulnerability(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Severity(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Critical'
        HIGH = 'HIGH', 'High'
        MEDIUM = 'MEDIUM', 'Medium'
        LOW = 'LOW', 'Low'
        INFO = 'INFO', 'Informational'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        RESOLVED = 'RESOLVED', 'Resolved'
        ACCEPTED_RISK = 'ACCEPTED_RISK', 'Accepted Risk'
        FALSE_POSITIVE = 'FALSE_POSITIVE', 'False Positive'
        RETEST_PENDING = 'RETEST_PENDING', 'Retest Pending'
        RETEST_FAILED = 'RETEST_FAILED', 'Retest Failed'

    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='vulnerabilities')
    title = models.CharField(max_length=255)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    cvss_base_score = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    cvss_vector = models.CharField(max_length=100, blank=True)
    details_md = models.TextField(help_text='Markdown with sections: Description, Impact, Likelihood, Proof of Concept, Steps to Reproduce, Remediation')
    references = models.JSONField(default=list, blank=True, help_text='List of reference URLs or citations')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_vulns')
    last_edited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='edited_vulns')
    assets = models.ManyToManyField(Asset, through='VulnerabilityAsset', related_name='vulnerabilities')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def company(self):
        return self.report.company

    def __str__(self):
        return self.title

class VulnerabilityAsset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vulnerability = models.ForeignKey(Vulnerability, on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE)
    notes_md = models.TextField(blank=True)

class Retest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    class Status(models.TextChoices):
        PASSED = 'PASSED', 'Passed (Fixed)'
        FAILED = 'FAILED', 'Failed (Still Vulnerable)'
        PARTIAL = 'PARTIAL', 'Partial'

    vulnerability = models.ForeignKey(Vulnerability, on_delete=models.CASCADE, related_name='retests')
    retest_date = models.DateField(auto_now_add=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=Status.choices)
    notes_md = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    report = models.ForeignKey(Report, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    vulnerability = models.ForeignKey(Vulnerability, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    retest = models.ForeignKey(Retest, on_delete=models.CASCADE, null=True, blank=True, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    body_md = models.TextField()
    is_internal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Attachment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(Report, on_delete=models.CASCADE, null=True, blank=True, related_name='attachments')
    vulnerability = models.ForeignKey(Vulnerability, on_delete=models.CASCADE, null=True, blank=True, related_name='attachments')
    file = models.FileField(upload_to='attachments/')
    file_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

class ActivityLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='activity_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    entity_type = models.CharField(max_length=50)
    entity_id = models.UUIDField()
    action = models.CharField(max_length=50)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
