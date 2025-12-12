from django.core.management.base import BaseCommand
from django.utils import timezone
from vulnsphere.models import (
    Company, Project, Vulnerability, User, ReportTemplate, GeneratedReport,
    Asset, VulnerabilityAsset, ProjectAsset, Retest, Comment
)
from datetime import timedelta, date
import random
import uuid
import re
from django.core.files.base import ContentFile

class Command(BaseCommand):
    help = 'Creates demo data for testing purposes'

    def handle(self, *args, **kwargs):
        self.stdout.write('Creating demo data...')

        # Ensure we have an admin user
        admin_user = User.objects.filter(role=User.Role.ADMIN).first()
        if not admin_user:
            self.stdout.write(self.style.WARNING('No admin user found. Creating one...'))
            admin_user = User.objects.create_superuser('admin@example.com', 'password', name='Admin User')

        # Create Directory for templates if not exists
        import os
        from django.conf import settings
        from django.core.files.base import ContentFile
        
        # Create HTML Template
        html_content = """
        <html>
        <head><title>{{ project.title }} Report</title></head>
        <body>
            <h1>{{ project.title }}</h1>
            <p><strong>Company:</strong> {{ project.company }}</p>
            <p><strong>Status:</strong> {{ project.status }}</p>
            <hr>
            <h2>Vulnerabilities</h2>
            {% for vuln in vulnerabilities %}
                <h3>{{ vuln.title }} ({{ vuln.severity }})</h3>
                <p>Status: {{ vuln.status }}</p>
                <div>{{ vuln.description }}</div>
                <hr>
            {% endfor %}
        </body>
        </html>
        """
        
        template_html, _ = ReportTemplate.objects.get_or_create(
            name='Standard HTML Report',
            defaults={'description': 'Standard HTML vulnerability report template'}
        )
        if not template_html.file:
            template_html.file.save('standard_template.html', ContentFile(html_content))
            template_html.save()

        # Create DOCX Template (dummy for now, but needs to be a valid zip/docx structure for docxtpl to check)
        # Creating a valid empty docx is complex without a lib. 
        # For demo purposes, we will try to skip docx generation in default run or assume a file exists.
        # But wait, user wants to test. Let's just create a text file for now if they choose HTML?
        # No, docxtpl needs a real docx. 
        # We will focus on HTML since user specifically asked about "package not found at ... professional_report.html"
        
        # NOTE: If we want to support docx demo, we need a valid base docx. 
        # For now, we ensuring HTML works.


        # Create realistic companies
        companies_data = [
            {
                'name': 'Acme Financial Services',
                'contact_email': 'security@acmefinancial.com',
                'address': '100 Wall Street, New York, NY 10005',
                'notes': 'Leading investment banking firm with extensive web presence'
            },
            {
                'name': 'TechCorp Solutions',
                'contact_email': 'it.security@techcorp.com',
                'address': '1 Technology Way, San Francisco, CA 94105',
                'notes': 'Enterprise software development company'
            },
            {
                'name': 'Global Healthcare Inc',
                'contact_email': 'privacy@globalhealth.com',
                'address': '500 Medical Center Blvd, Boston, MA 02115',
                'notes': 'Healthcare management system provider'
            },
            {
                'name': 'RetailMax Chain',
                'contact_email': 'devops@retailmax.com',
                'address': '2500 Commerce Drive, Chicago, IL 60606',
                'notes': 'National retail chain with e-commerce platform'
            },
            {
                'name': 'SecureNet Systems',
                'contact_email': 'admin@securenet.com',
                'address': '789 Cyber Lane, Austin, TX 78701',
                'notes': 'Cybersecurity consulting firm'
            }
        ]
        
        companies = []
        for company_data in companies_data:
            company, created = Company.objects.get_or_create(
                name=company_data['name'],
                defaults=company_data
            )
            companies.append(company)
            if created:
                self.stdout.write(f'Created company: {company.name}')

        # Realistic vulnerability data
        vulnerability_templates = [
            {
                'title': 'SQL Injection in Login Form',
                'severity': 'CRITICAL',
                'cvss_score': 9.8,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
                'description': 'SQL injection vulnerability found in the authentication login form allowing unauthorized database access.',
                'impact': 'Complete database compromise, data exfiltration, potential system takeover.',
                'remediation': 'Implement parameterized queries and input validation. Use prepared statements for all database operations.'
            },
            {
                'title': 'Cross-Site Scripting (XSS) in User Profile',
                'severity': 'HIGH',
                'cvss_score': 8.2,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N',
                'description': 'Reflected XSS vulnerability in user profile update functionality.',
                'impact': 'Session hijacking, credential theft, malicious script execution in victims browsers.',
                'remediation': 'Implement proper output encoding and Content Security Policy (CSP).'
            },
            {
                'title': 'Insecure Direct Object Reference (IDOR)',
                'severity': 'MEDIUM',
                'cvss_score': 6.5,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N',
                'description': 'IDOR vulnerability allowing unauthorized access to other users data.',
                'impact': 'Unauthorized data access, privacy violation, potential data breach.',
                'remediation': 'Implement proper authorization checks and UUID-based identifiers.'
            },
            {
                'title': 'Outdated Apache Tomcat Version',
                'severity': 'HIGH',
                'cvss_score': 8.1,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H',
                'description': 'Server running outdated Apache Tomcat with known CVEs.',
                'impact': 'Remote code execution, server compromise, data breach.',
                'remediation': 'Upgrade Apache Tomcat to latest stable version. Apply security patches.'
            },
            {
                'title': 'Weak Password Policy Implementation',
                'severity': 'MEDIUM',
                'cvss_score': 5.4,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
                'description': 'Password policy does not enforce complexity requirements.',
                'impact': 'Brute force attacks, credential stuffing, account compromise.',
                'remediation': 'Implement strong password policy with minimum length, complexity, and history requirements.'
            },
            {
                'title': 'Unencrypted Sensitive Data Transmission',
                'severity': 'HIGH',
                'cvss_score': 7.5,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N',
                'description': 'Sensitive data transmitted over unencrypted HTTP connections.',
                'impact': 'Data interception, credential theft, privacy violation.',
                'remediation': 'Implement TLS/SSL for all data transmission. Use HTTPS exclusively.'
            },
            {
                'title': 'Directory Traversal Vulnerability',
                'severity': 'MEDIUM',
                'cvss_score': 6.8,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N',
                'description': 'Directory traversal in file download functionality.',
                'impact': 'Unauthorized file access, sensitive data exposure, system information disclosure.',
                'remediation': 'Validate and sanitize all file path inputs. Implement proper access controls.'
            },
            {
                'title': 'Server-Side Request Forgery (SSRF)',
                'severity': 'CRITICAL',
                'cvss_score': 9.6,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
                'description': 'SSRF vulnerability allowing server to make arbitrary requests.',
                'impact': 'Internal network scanning, data exfiltration, cloud metadata access.',
                'remediation': 'Implement URL allowlist, validate all user-supplied URLs, disable redirects.'
            },
            {
                'title': 'Insecure File Upload',
                'severity': 'HIGH',
                'cvss_score': 8.8,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
                'description': 'File upload functionality allows arbitrary file types.',
                'impact': 'Remote code execution, web shell upload, server compromise.',
                'remediation': 'Implement strict file type validation, scan uploads, store outside web root.'
            },
            {
                'title': 'Missing Security Headers',
                'severity': 'LOW',
                'cvss_score': 3.7,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:N',
                'description': 'Critical security headers missing from HTTP responses.',
                'impact': 'Various client-side attacks including XSS and clickjacking.',
                'remediation': 'Implement X-Frame-Options, X-Content-Type-Options, CSP, and other security headers.'
            },
            {
                'title': 'Broken Authentication Session Management',
                'severity': 'HIGH',
                'cvss_score': 8.3,
                'cvss_vector': 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:H',
                'description': 'Session tokens not properly invalidated on logout.',
                'impact': 'Session hijacking, unauthorized account access, privilege escalation.',
                'remediation': 'Implement proper session invalidation, secure session storage, and timeout mechanisms.'
            }
        ]

        # Asset types for each company
        asset_types = [
            {'name': 'Main Web Application', 'type': 'WEB_APP', 'identifier': 'https://app.{domain}.com'},
            {'name': 'Admin Portal', 'type': 'WEB_APP', 'identifier': 'https://admin.{domain}.com'},
            {'name': 'API Gateway', 'type': 'API', 'identifier': 'https://api.{domain}.com'},
            {'name': 'Mobile Application', 'type': 'MOBILE_APP', 'identifier': 'com.{domain}.mobile'},
            {'name': 'Database Server', 'type': 'SERVER', 'identifier': 'db01.{domain}.com'},
            {'name': 'Load Balancer', 'type': 'NETWORK_DEVICE', 'identifier': 'lb01.{domain}.com'}
        ]

        # Engagement types
        engagement_types = [
            'Web Application Penetration Test',
            'API Security Assessment',
            'Mobile Application Security Test',
            'Network Penetration Test',
            'Red Team Engagement',
            'Social Engineering Assessment'
        ]

        severities = [choice[0] for choice in Vulnerability.Severity.choices]
        statuses = [choice[0] for choice in Vulnerability.Status.choices]

        for company in companies:
            # Create assets for this company
            domain = re.sub(r'[^a-z0-9]+', '', company.name.lower())
            company_assets = []
            
            for asset_data in asset_types:
                asset, created = Asset.objects.get_or_create(
                    company=company,
                    identifier=asset_data['identifier'].format(domain=domain),
                    defaults={
                        'name': asset_data['name'],
                        'type': asset_data['type'],
                        'description': f'{asset_data["name"]} for {company.name}'
                    }
                )
                company_assets.append(asset)
                if created:
                    self.stdout.write(f'Created asset: {asset.name}')

            # Create multiple projects for each company
            for j in range(len(engagement_types)):
                project_start = timezone.now().date() - timedelta(days=random.randint(30, 90))
                project_end = project_start + timedelta(days=random.randint(14, 45))
                
                project, created = Project.objects.get_or_create(
                    title=f'{company.name} - {engagement_types[j]}',
                    company=company,
                    defaults={
                        'engagement_type': engagement_types[j],
                        'start_date': project_start,
                        'end_date': project_end,
                        'status': random.choice(list(Project.Status.choices))[0],
                        'scope_description': f'Comprehensive security assessment of {company.name} {engagement_types[j].lower()} scope including all production systems and applications.',
                        'summary': f'Security engagement focused on identifying vulnerabilities in {company.name}\'s {engagement_types[j].lower()} infrastructure.',
                        'created_by': admin_user,
                        'last_edited_by': admin_user
                    }
                )
                if created:
                    self.stdout.write(f'Created project: {project.title}')

                # Attach relevant assets to project
                num_assets_to_attach = random.randint(2, len(company_assets))
                selected_assets = random.sample(company_assets, num_assets_to_attach)
                
                for asset in selected_assets:
                    ProjectAsset.objects.get_or_create(
                        project=project,
                        asset=asset,
                        defaults={'auto_attached': False, 'attached_by': admin_user}
                    )

                # Create realistic vulnerabilities for each project
                num_vulns = random.randint(8, 15)
                selected_templates = random.sample(vulnerability_templates, min(num_vulns, len(vulnerability_templates)))
                
                for k, vuln_template in enumerate(selected_templates):
                    vuln, v_created = Vulnerability.objects.get_or_create(
                        title=vuln_template['title'],
                        project=project,
                        defaults={
                            'severity': vuln_template['severity'],
                            'status': random.choice(statuses),
                            'cvss_base_score': vuln_template['cvss_score'],
                            'cvss_vector': vuln_template['cvss_vector'],
                            'details_md': f'''## Description
{vuln_template['description']}

## Impact
{vuln_template['impact']}

## Likelihood
High - This vulnerability can be easily exploited by attackers with minimal technical expertise.

## Proof of Concept
```bash
# Example exploitation command
curl -X POST "https://target.com/endpoint" \
  -d "parameter=malicious_payload" \
  -H "Content-Type: application/x-www-form-urlencoded"
```

## Steps to Reproduce
1. Navigate to the affected functionality
2. Submit malicious input in the vulnerable parameter
3. Observe the successful exploitation

## Remediation
{vuln_template['remediation']}

## References
- CWE-79: Cross-site Scripting
- OWASP Top Ten 2021
- NIST SP 800-53''',
                            'references': [
                                'https://owasp.org/',
                                'https://cwe.mitre.org/',
                                'https://nvd.nist.gov/'
                            ],
                            'created_by': admin_user,
                            'last_edited_by': admin_user
                        }
                    )
                    
                    if v_created:
                        # Attach vulnerability to random assets
                        num_asset_links = random.randint(1, min(3, len(selected_assets)))
                        affected_assets = random.sample(selected_assets, num_asset_links)
                        
                        for asset in affected_assets:
                            VulnerabilityAsset.objects.get_or_create(
                                vulnerability=vuln,
                                asset=asset,
                                defaults={'notes_md': f'Vulnerability confirmed on {asset.name}'}
                            )
                        
                        # Create retest for some vulnerabilities
                        if random.random() > 0.6:
                            Retest.objects.create(
                                vulnerability=vuln,
                                status=random.choice(list(Retest.Status.choices))[0],
                                notes_md=f'Retest conducted on {timezone.now().date()}. Vulnerability status verified.',
                                performed_by=admin_user,
                                request_type=random.choice(list(Retest.RequestType.choices))[0]
                            )
                        
                        # Create comments for some vulnerabilities
                        if random.random() > 0.7:
                            Comment.objects.create(
                                company=company,
                                vulnerability=vuln,
                                author=admin_user,
                                body_md=f'Internal note: This vulnerability requires immediate attention from the development team.',
                                is_internal=True
                            )

                # Create generated reports
                for template in [template_html]:
                    if random.random() > 0.3:  # 70% chance of having a report
                        GeneratedReport.objects.create(
                            project=project,
                            company=company,
                            template=template,
                            format=random.choice(list(GeneratedReport.Format.choices))[0],
                            created_by=admin_user,
                            is_failed=random.random() < 0.1  # 10% chance of failure
                        )
        
        self.stdout.write(self.style.SUCCESS(f'Successfully created realistic demo data!'))
        self.stdout.write(f'Companies: {len(companies)}')
        self.stdout.write(f'Projects: {Project.objects.count()}')
        self.stdout.write(f'Assets: {Asset.objects.count()}')
        self.stdout.write(f'Vulnerabilities: {Vulnerability.objects.count()}')
        self.stdout.write(f'Retests: {Retest.objects.count()}')
        self.stdout.write(f'Comments: {Comment.objects.count()}')
        self.stdout.write(f'Reports: {GeneratedReport.objects.count()}')
