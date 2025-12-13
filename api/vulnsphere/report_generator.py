import os
import base64
import mimetypes
from django.conf import settings
from django.core.files.base import ContentFile
from docxtpl import DocxTemplate
from io import BytesIO
from .models import GeneratedReport, Project, Company
import markdown2
import re
from pathlib import Path

def render_markdown(text, inline_images=False):
    """
    Convert markdown text to clean HTML with code highlighting and optional inline image support.
    
    Args:
        text: Markdown formatted text
        inline_images: If True, embed images as base64 data URIs (for HTML). 
                      If False, keep original image paths (for DOCX).
        
    Returns:
        Clean HTML string with syntax highlighting and optionally embedded images
    """
    if not text:
        return ""
    
    # Configure markdown2 with extras for code highlighting, tables, etc.
    extras = [
        'fenced-code-blocks',  # Support ```language code blocks
        'code-friendly',       # Better code handling
        'tables',              # Support markdown tables
        'break-on-newline',    # Line breaks work as expected
        'cuddled-lists',       # Better list formatting
        'header-ids',          # Add IDs to headers
    ]
    
    # Convert markdown to HTML
    html = markdown2.markdown(text, extras=extras)
    
    # Process images and convert to inline base64 data URIs only for HTML reports
    if inline_images:
        html = _embed_images_as_base64(html)
    
    return html

def _embed_images_as_base64(html):
    """
    Find all <img> tags in HTML and convert their src to base64 data URIs.
    
    Args:
        html: HTML string with <img> tags
        
    Returns:
        HTML string with images embedded as base64 data URIs
    """
    # Pattern to match img tags with src attribute
    img_pattern = re.compile(r'<img([^>]*?)src=["\']([^"\']+)["\']([^>]*?)>', re.IGNORECASE)
    
    def replace_img(match):
        before_src = match.group(1)
        img_path = match.group(2)
        after_src = match.group(3)
        
        # Skip if already a data URI
        if img_path.startswith('data:'):
            return match.group(0)
        
        # Try to convert to base64
        base64_uri = _image_to_base64(img_path)
        if base64_uri:
            return f'<img{before_src}src="{base64_uri}"{after_src}>'
        
        # If conversion fails, return original
        return match.group(0)
    
    return img_pattern.sub(replace_img, html)

def _image_to_base64(image_path):
    """
    Convert an image file to a base64 data URI.
    
    Args:
        image_path: Path to the image file (can be relative or absolute)
        
    Returns:
        Base64 data URI string or None if conversion fails
    """
    try:
        # Handle different path formats
        if image_path.startswith('http://') or image_path.startswith('https://'):
            # External URLs - skip for now (could implement fetching if needed)
            return None
        
        # Remove leading slash if present and treat as relative to MEDIA_ROOT
        if image_path.startswith('/'):
            image_path = image_path.lstrip('/')
        
        # Construct full path relative to media root
        full_path = os.path.join(settings.MEDIA_ROOT, image_path)
        
        # Check if file exists
        if not os.path.exists(full_path):
            return None
        
        # Read the image file
        with open(full_path, 'rb') as img_file:
            img_data = img_file.read()
        
        # Encode to base64
        img_base64 = base64.b64encode(img_data).decode('utf-8')
        
        # Determine MIME type
        mime_type, _ = mimetypes.guess_type(full_path)
        if not mime_type:
            # Default to common image types based on extension
            ext = Path(full_path).suffix.lower()
            mime_map = {
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.svg': 'image/svg+xml',
                '.bmp': 'image/bmp',
            }
            mime_type = mime_map.get(ext, 'image/png')
        
        # Create data URI
        data_uri = f'data:{mime_type};base64,{img_base64}'
        return data_uri
        
    except Exception as e:
        # Log error but don't crash
        print(f"Error converting image to base64: {image_path} - {str(e)}")
        return None

class ReportGenerator:
    def generate_report(self, template, context, output_format, generated_report_instance):
        try:
            if not template.file:
                raise ValueError("Template file/package not found")

            if output_format == GeneratedReport.Format.DOCX:
                self._generate_docx(template, context, generated_report_instance)
            elif output_format == GeneratedReport.Format.HTML:
                self._generate_html(template, context, generated_report_instance)
            
        except Exception as e:
            generated_report_instance.is_failed = True
            generated_report_instance.error_message = str(e)
            generated_report_instance.save()
            raise e

    def _generate_docx(self, template, context, generated_report_instance):
        doc = DocxTemplate(template.file.path)
        
        # Sanitize context to only include primitive data structures
        sanitized_context = self._sanitize_context(context)
        
        # Add today's date to context
        from datetime import date
        sanitized_context['today'] = date.today().strftime('%B %d, %Y')
        
        doc.render(sanitized_context)
        
        # Save to buffer
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        # Save to FileField
        filename = f"report_{generated_report_instance.id}.docx"
        generated_report_instance.file.save(filename, ContentFile(buffer.read()))
        generated_report_instance.save()

    def _generate_html(self, template, context, report_instance):
        """Generate HTML report using secure Jinja2 template"""
        try:
            # Read the template file
            template_content = template.file.read().decode('utf-8')
            
            # Create Jinja2 environment with relaxed security for report generation
            from jinja2 import Environment, TemplateSyntaxError
            
            env = Environment(
                autoescape=True,
                line_statement_prefix=None,
                line_comment_prefix=None,
                trim_blocks=True,
                lstrip_blocks=True
            )
            
            # Add custom filter for safe formatting
            def safe_format(value, pattern):
                """Safe string formatting that handles various types"""
                try:
                    if isinstance(value, (int, float)):
                        return pattern % value
                    elif isinstance(value, str):
                        return pattern % value
                    else:
                        return pattern % str(value)
                except (TypeError, ValueError):
                    return str(pattern) % str(value)
            
            # Add markdown filter
            def markdown_filter(text):
                """Convert markdown to HTML"""
                try:
                    import markdown
                    return markdown.markdown(text, extensions=['fenced_code', 'codehilite', 'tables'])
                except ImportError:
                    return text
            
            # Register custom filters
            env.filters['safe_format'] = safe_format
            env.filters['markdown'] = markdown_filter
            
            # Create template from string
            jinja_template = env.from_string(template_content)
            
            # Sanitize context to only include primitive data structures
            sanitized_context = self._sanitize_context(context)
            
            # Add today's date to context
            from datetime import date
            sanitized_context['today'] = date.today().strftime('%B %d, %Y')
            
            # Render the template
            html_output = jinja_template.render(sanitized_context)
            
            # Save the output
            output_filename = f'report_{report_instance.id}.html'
            report_instance.file.save(output_filename, ContentFile(html_output.encode('utf-8')))
            
        except TemplateSyntaxError as e:
            raise Exception(f"Template syntax error: {str(e)}")
        except Exception as e:
            raise Exception(f"Error generating HTML report: {str(e)}")
    
    def _sanitize_context(self, context):
        """Sanitize context to only include primitive data structures"""
        def sanitize_value(value):
            # Handle primitive types
            if isinstance(value, (str, int, float, bool)) or value is None:
                return value
            
            # Handle lists and tuples
            if isinstance(value, (list, tuple)):
                return [sanitize_value(item) for item in value]
            
            # Handle dictionaries
            if isinstance(value, dict):
                return {str(k): sanitize_value(v) for k, v in value.items()}
            
            # For any other objects, convert to string representation
            return str(value)
        
        return {str(k): sanitize_value(v) for k, v in context.items()}
    
    def get_project_context(self, project, inline_images=False):
        """Get comprehensive project context for report generation"""
        from .serializers import VulnerabilitySerializer
        from collections import Counter
        
        vulnerabilities = project.vulnerabilities.all().order_by('-severity', '-created_at')
        
        # Calculate severity counts
        counts = Counter(v.severity for v in vulnerabilities)
        severity_counts = {
            'critical': int(counts.get('CRITICAL', 0)),
            'high': int(counts.get('HIGH', 0)),
            'medium': int(counts.get('MEDIUM', 0)),
            'low': int(counts.get('LOW', 0)),
            'info': int(counts.get('INFO', 0)),
            'total': int(len(vulnerabilities))
        }
        
        assets = project.assets.all()
        assets_list = [{'name': a.name, 'type': a.get_type_display(), 'url': a.identifier, 'is_active': bool(a.is_active)} for a in assets]
        
        context = {
            'project': {
                'id': str(project.id),
                'title': project.title,
                'company': project.company.name,
                'engagement_type': project.engagement_type,
                'summary': render_markdown(project.summary, inline_images=inline_images),
                'scope': render_markdown(project.scope_description, inline_images=inline_images),
                'start_date': project.start_date.strftime('%B %d, %Y'),
                'end_date': project.end_date.strftime('%B %d, %Y'),
                'status': project.get_status_display(),
                'status_code': project.status,
            },
            'severity_counts': severity_counts,
            'severities': [
                {'severity': 'critical', 'label': 'Critical', 'count': severity_counts['critical']},
                {'severity': 'high', 'label': 'High', 'count': severity_counts['high']},
                {'severity': 'medium', 'label': 'Medium', 'count': severity_counts['medium']},
                {'severity': 'low', 'label': 'Low', 'count': severity_counts['low']},
                {'severity': 'info', 'label': 'Info', 'count': severity_counts['info']}
            ],
            'assets': assets_list,
            'vulnerabilities': []
        }
        
        for vuln in vulnerabilities:
            # Convert markdown to HTML for clean rendering
            vuln_assets = ", ".join([a.name for a in vuln.assets.all()])
            
            vuln_data = {
                'id': str(vuln.id),
                'title': vuln.title,
                'severity': 'Info' if vuln.get_severity_display() == 'Informational' else vuln.get_severity_display(),
                'severity_display': 'Info' if vuln.get_severity_display() == 'Informational' else vuln.get_severity_display(),
                'status': vuln.get_status_display(),
                'status_code': vuln.status,
                'cvss_score': str(vuln.cvss_base_score) if vuln.cvss_base_score else 'N/A',
                'cvss_vector': vuln.cvss_vector,
                'description': render_markdown(vuln.details_md, inline_images=inline_images),
                'created_at': vuln.created_at.strftime('%B %d, %Y'),
                'assets': [{'name': a.name, 'url': a.identifier} for a in vuln.assets.all()],
                'retests': []
            }
            
            # Include retests with markdown-rendered notes
            for retest in vuln.retests.all().order_by('-created_at'):
                retest_data = {
                    'id': str(retest.id),
                    'request_type': retest.get_request_type_display(),
                    'status': retest.get_status_display() if retest.status else 'N/A',
                    'retest_date': retest.retest_date.strftime('%B %d, %Y'),
                    'performed_by': retest.performed_by.name if retest.performed_by else 'N/A',
                    'requested_by': retest.requested_by.name if retest.requested_by else 'N/A',
                    'notes': render_markdown(retest.notes_md, inline_images=inline_images),  # Rendered HTML
                }
                vuln_data['retests'].append(retest_data)
            
            context['vulnerabilities'].append(vuln_data)
        
        return context
    
    def get_company_context(self, company, inline_images=False):
        """Get comprehensive company context for report generation"""
        from collections import Counter
        
        projects = company.projects.all().order_by('-created_at')
        
        # Calculate company-wide severity counts across all projects
        all_vulnerabilities = []
        for project in projects:
            all_vulnerabilities.extend(project.vulnerabilities.all())
        
        counts = Counter(v.severity for v in all_vulnerabilities)
        company_severity_counts = {
            'critical': int(counts.get('CRITICAL', 0)),
            'high': int(counts.get('HIGH', 0)),
            'medium': int(counts.get('MEDIUM', 0)),
            'low': int(counts.get('LOW', 0)),
            'info': int(counts.get('INFO', 0)),
            'total': int(len(all_vulnerabilities))
        }
        
        context = {
            'company': {
                'id': str(company.id),
                'name': company.name,
                'email': company.contact_email,
                'address': company.address,
                'notes': render_markdown(company.notes, inline_images=inline_images),
            },
            'company_severity_counts': company_severity_counts,
            'company_severities': [
                {'severity': 'critical', 'label': 'Critical', 'count': company_severity_counts['critical']},
                {'severity': 'high', 'label': 'High', 'count': company_severity_counts['high']},
                {'severity': 'medium', 'label': 'Medium', 'count': company_severity_counts['medium']},
                {'severity': 'low', 'label': 'Low', 'count': company_severity_counts['low']},
                {'severity': 'info', 'label': 'Info', 'count': company_severity_counts['info']}
            ],
            'projects': []
        }
        
        for project in projects:
            context['projects'].append({
                'id': str(project.id),
                'title': project.title,
                'engagement_type': project.engagement_type,
                'start_date': project.start_date.strftime('%B %d, %Y'),
                'end_date': project.end_date.strftime('%B %d, %Y'),
                'status': project.get_status_display(),
                'status_code': project.status,
                'vuln_count': project.vulnerabilities.count(),
            })
        
        return context
