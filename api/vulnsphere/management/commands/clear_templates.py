from django.core.management.base import BaseCommand
from django.db import transaction
from vulnsphere.models import VulnerabilityTemplate


class Command(BaseCommand):
    help = 'Clear all vulnerability templates from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Skip confirmation prompt',
        )
        parser.add_argument(
            '--count',
            action='store_true',
            help='Only show the count of templates that would be deleted',
        )

    def handle(self, *args, **options):
        # Count templates
        template_count = VulnerabilityTemplate.objects.count()
        
        if template_count == 0:
            self.stdout.write(self.style.WARNING('No vulnerability templates found in the database.'))
            return
        
        if options['count']:
            self.stdout.write(f'Found {template_count} vulnerability template(s) in the database.')
            return
        
        # Show what will be deleted
        self.stdout.write(f'Found {template_count} vulnerability template(s) in the database.')
        
        # List templates (up to 10)
        templates = VulnerabilityTemplate.objects.all()[:10]
        for template in templates:
            self.stdout.write(f'  - {template.title} (Severity: {template.severity})')
        
        if template_count > 10:
            self.stdout.write(f'  ... and {template_count - 10} more')
        
        # Confirmation
        if not options['confirm']:
            confirm = input(f'\nAre you sure you want to delete all {template_count} vulnerability templates? Type "yes" to confirm: ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.ERROR('Operation cancelled.'))
                return
        
        # Delete templates
        try:
            with transaction.atomic():
                deleted_count, _ = VulnerabilityTemplate.objects.all().delete()
                
            self.stdout.write(
                self.style.SUCCESS(f'Successfully deleted {deleted_count} vulnerability template(s).')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error deleting templates: {str(e)}')
            )
