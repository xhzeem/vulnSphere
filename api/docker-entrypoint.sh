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

# Import report templates
echo "Importing report templates..."
python manage.py shell << 'PYTHON_SCRIPT'
from vulnsphere.models import ReportTemplate
from django.core.files import File
import os

# Import HTML template
html_template_path = '/app/media/report_templates/standard_template.html'
if os.path.exists(html_template_path):
    if not ReportTemplate.objects.filter(name='Standard HTML Report Template').exists():
        with open(html_template_path, 'rb') as f:
            template = ReportTemplate(
                name='Standard HTML Report Template',
                description='Security assessment report template with executive summary, scope overview, vulnerability summary, and detailed findings.'
            )
            template.file.save('standard_template.html', File(f), save=True)
            print("Created HTML report template")
    else:
        print("HTML template already exists")
else:
    print("HTML template file not found")

# Import DOCX template
docx_template_path = '/app/media/report_templates/standard_template.docx'
if os.path.exists(docx_template_path):
    if not ReportTemplate.objects.filter(name='Standard DOCX Report Template').exists():
        with open(docx_template_path, 'rb') as f:
            template = ReportTemplate(
                name='Standard DOCX Report Template',
                description='Security assessment report template with executive summary, scope overview, vulnerability summary, and detailed findings.'
            )
            template.file.save('standard_template.docx', File(f), save=True)
            print("Created DOCX report template")
    else:
        print("DOCX template already exists")
else:
    print("DOCX template file not found")

PYTHON_SCRIPT

# Import vulnerability templates
echo "Importing vulnerability templates..."
python manage.py shell << 'PYTHON_SCRIPT'
from vulnsphere.models import VulnerabilityTemplate
import os
import json
import csv
import io

# Check for vulnerability templates directory
vuln_templates_dir = '/app/media/vuln_templates'
if os.path.exists(vuln_templates_dir):
    # Look for both JSON and CSV files
    json_files = [f for f in os.listdir(vuln_templates_dir) if f.endswith('.json')]
    csv_files = [f for f in os.listdir(vuln_templates_dir) if f.endswith('.csv')]
    template_files = json_files + csv_files
    print(f"Found {len(template_files)} vulnerability template files ({len(json_files)} JSON, {len(csv_files)} CSV)")
    
    for template_file in template_files:
        file_path = os.path.join(vuln_templates_dir, template_file)
        try:
            if template_file.endswith('.json'):
                # Handle JSON files
                with open(file_path, 'r') as f:
                    template_data = json.load(f)
                
                # Use update_or_create to override duplicates
                template, created = VulnerabilityTemplate.objects.update_or_create(
                    title=template_data.get('title', ''),
                    defaults={
                        'severity': template_data.get('severity', 'MEDIUM'),
                        'cvss_base_score': template_data.get('cvss_base_score'),
                        'cvss_vector': template_data.get('cvss_vector', ''),
                        'details_md': template_data.get('details_md', ''),
                        'references': template_data.get('references', [])
                    }
                )
                action = 'Created' if created else 'Updated'
                print(f"{action} vulnerability template: {template.title}")
                
            elif template_file.endswith('.csv'):
                # Handle CSV files
                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    csv_count = 0
                    for row in reader:
                        if not row.get('title') or not row.get('title').strip():
                            continue
                            
                        # Parse references as list (comma-separated if string)
                        refs = row.get('references', '')
                        if isinstance(refs, str) and refs:
                            references = [r.strip() for r in refs.split(',') if r.strip()]
                        else:
                            references = []
                        
                        # Parse CVSS score
                        cvss_score = row.get('cvss_base_score', '').strip()
                        cvss_score = float(cvss_score) if cvss_score else None
                        
                        # Use update_or_create to override duplicates
                        template, created = VulnerabilityTemplate.objects.update_or_create(
                            title=row['title'].strip(),
                            defaults={
                                'severity': row.get('severity', '').strip().upper(),
                                'cvss_base_score': cvss_score,
                                'cvss_vector': row.get('cvss_vector', '').strip(),
                                'details_md': row.get('details_md', '').strip(),
                                'references': references
                            }
                        )
                        csv_count += 1
                        action = 'Created' if created else 'Updated'
                        if csv_count <= 5:  # Show first 5 items as examples
                            print(f"{action} vulnerability template: {template.title}")
                        elif csv_count == 6:
                            print("... (processing more templates)")
                    
                    print(f"Processed {csv_count} templates from {template_file}")
                    
        except Exception as e:
            print(f"Error importing template {template_file}: {e}")
else:
    print("Vulnerability templates directory not found")

PYTHON_SCRIPT

echo "Initialization complete!"
echo "Starting Django server..."

# Execute the command passed to the container
exec "$@"
