#!/bin/bash
set -e

echo "Starting VulnSphere API initialization..."

# Wait for database to be ready
echo "Waiting for database..."
while ! python manage.py dbshell --command="SELECT 1;" >/dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 1
done
echo "Database is ready!"

# Run migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Create default admin user
echo "Creating default admin user..."
python manage.py shell << 'PYTHON_SCRIPT'
from django.contrib.auth import get_user_model
from vulnsphere.models import ReportTemplate, VulnerabilityTemplate
from django.core.files import File
import os

User = get_user_model()

# Create admin user if it doesn't exist
if not User.objects.filter(username='admin').exists():
    admin_user = User.objects.create_user(
        email='admin@vulnsphere.com',
        username='admin',
        name='System Administrator',
        password='admin123',
        role='ADMIN',
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    print(f"Created admin user: {admin_user.email}")
else:
    print("Admin user already exists")

PYTHON_SCRIPT

# Import report templates via API
echo "Importing report templates via API..."
python manage.py shell << 'PYTHON_SCRIPT'
from django.contrib.auth import get_user_model
import json
import os

User = get_user_model()

# Get admin user
admin_user = User.objects.get(username='admin')

# Function to import report template via API
def import_report_template(template_path, template_name, template_description):
    if not os.path.exists(template_path):
        print(f"{template_name.split()[0]} template file not found")
        return
    
    # Import directly using model operations instead of API calls
    from vulnsphere.models import ReportTemplate
    from django.core.files import File
    
    # Check if template already exists
    template_exists = ReportTemplate.objects.filter(name=template_name).exists()
    
    if not template_exists:
        with open(template_path, 'rb') as f:
            template = ReportTemplate(
                name=template_name,
                description=template_description
            )
            template.file.save(os.path.basename(template_path), File(f), save=True)
            print(f"Created {template_name.split()[0]} report template")
    else:
        print(f"{template_name.split()[0]} template already exists")

# Import HTML template
import_report_template(
    '/app/media/report_templates/standard_template.html',
    'Standard HTML Report Template',
    'Security assessment report template with executive summary, scope overview, vulnerability summary, and detailed findings.'
)

# Import DOCX template
import_report_template(
    '/app/media/report_templates/standard_template.docx',
    'Standard DOCX Report Template',
    'Security assessment report template with executive summary, scope overview, vulnerability summary, and detailed findings.'
)

PYTHON_SCRIPT

# Import vulnerability templates via API
echo "Importing vulnerability templates via API..."
python manage.py shell << 'PYTHON_SCRIPT'
from django.contrib.auth import get_user_model
import json
import os
import csv
import io
import markdown2

User = get_user_model()

# Get admin user
admin_user = User.objects.get(username='admin')

# Check for vulnerability templates directory
vuln_templates_dir = '/app/media/vuln_templates'
if os.path.exists(vuln_templates_dir):
    # Look for CSV files only
    csv_files = [f for f in os.listdir(vuln_templates_dir) if f.endswith('.csv')]
    template_files = csv_files
    print(f"Found {len(template_files)} CSV vulnerability template files")
    
    for template_file in template_files:
        file_path = os.path.join(vuln_templates_dir, template_file)
        try:
            # Process CSV file directly (simulating bulk-import endpoint logic)
            with open(file_path, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                
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
                        
                        # Convert markdown to HTML for details
                        details_md = row.get('details_md', '').strip()
                        details_html = markdown2.markdown(
                            details_md, 
                            extras=['tables', 'fenced-code-blocks', 'code-friendly', 'header-ids']
                        ) if details_md else ''
                        
                        # Check if template already exists and update it, or create new
                        from vulnsphere.models import VulnerabilityTemplate
                        template, created_new = VulnerabilityTemplate.objects.update_or_create(
                            title=template_title,
                            defaults={
                                'severity': row['severity'].strip().upper(),
                                'cvss_base_score': cvss_score,
                                'cvss_vector': row.get('cvss_vector', '').strip(),
                                'details_html': details_html,
                                'references': references,
                                'created_by': admin_user
                            }
                        )
                        
                        action = 'created' if created_new else 'updated'
                        created.append({'id': str(template.id), 'title': template.title, 'action': action})
                    except Exception as e:
                        errors.append({'row': row_num, 'error': str(e)})
                
                created_count = len([item for item in created if item['action'] == 'created'])
                updated_count = len([item for item in created if item['action'] == 'updated'])
                
                print(f"Processed {template_file}: {created_count} created, {updated_count} updated, {len(created)} total")
                if errors:
                    print(f"Errors in {template_file}: {len(errors)}")
                    for error in errors[:3]:  # Show first 3 errors
                        print(f"  Row {error['row']}: {error['error']}")
                    
        except Exception as e:
            print(f"Error importing template {template_file}: {e}")
else:
    print("Vulnerability templates directory not found")

PYTHON_SCRIPT

echo "Initialization complete!"
echo "Starting Django server..."

# Execute the command passed to the container
exec "$@"
