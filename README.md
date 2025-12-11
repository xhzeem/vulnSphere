# VulnSphere

A comprehensive multi-tenant vulnerability reporting and management platform built with Django and React.

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture**: Support for multiple companies and projects
- **Vulnerability Management**: Track, assess, and remediate security findings
- **Report Generation**: Automated professional security reports in multiple formats
- **Template System**: Reusable vulnerability and report templates
- **User Management**: Role-based access control (Admin, Tester, Client)
- **Activity Logging**: Comprehensive audit trail of all system activities

### Technical Stack
- **Backend**: Django 6.0 with Django REST Framework
- **Frontend**: React with modern UI components
- **Database**: PostgreSQL with optimized migrations
- **Authentication**: JWT-based with email/username login
- **Containerization**: Docker with multi-architecture support
- **CI/CD**: GitHub Actions with automated testing and security scanning

### Key Features
- **Vulnerability Templates**: 500+ pre-loaded security templates
- **Bulk Import**: CSV upload with duplicate override capability
- **Report Templates**: HTML and DOCX templates for professional reports
- **Real-time Updates**: WebSocket support for live collaboration
- **API Documentation**: OpenAPI/Swagger with interactive testing
- **Security Focus**: CVSS scoring, severity classification, and remediation tracking

## 📸 Screenshot
![Screenshot](https://i.postimg.cc/pVB3w2bm/Screenshot-2025-12-11-at-10-02-18-PM.png)

## 🛠️ Installation

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.13+ (for backend development)

### Quick Start
```bash
# Download the compose file
wget https://raw.githubusercontent.com/xhzeem/VulnSphere/main/compose.standalone.yml

# Start all services
docker compose -f compose.standalone.yml up -d

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:8000
# API Documentation: http://localhost:8000/api/docs/
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL=postgresql://vulnsphere:vulnsphere123@db:5432/vulnsphere

# Django
SECRET_KEY=your-secret-key-here
DEBUG=false
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

## 🏗️ Development

### Backend Development
```bash
cd api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

### Frontend Development
```bash
cd frontend
npm install
npm start
```

### Database Migrations
```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate
```

## 📚 API Documentation

### Authentication
```http
POST /api/v1/auth/login/
Content-Type: application/json

{
  "username": "admin@example.com",
  "password": "admin123"
}
```

### Vulnerability Templates
```http
GET /api/v1/vulnerability-templates/
Authorization: Bearer <token>

# Bulk Import
POST /api/v1/vulnerability-templates/bulk-import/
Content-Type: multipart/form-data

file: <csv_file>
```

### Companies & Projects
```http
# List Companies
GET /api/v1/companies/

# Create Company
POST /api/v1/companies/
{
  "name": "Company Name",
  "description": "Company Description"
}

# List Projects
GET /api/v1/projects/

# Create Project
POST /api/v1/projects/
{
  "name": "Project Name",
  "company": "company-id",
  "description": "Project Description"
}
```

## 🔧 Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `sqlite:///db.sqlite3` |
| `SECRET_KEY` | Django secret key | Auto-generated |
| `DEBUG` | Enable debug mode | `True` |
| `ALLOWED_HOSTS` | Allowed hosts for Django | `localhost,127.0.0.1` |

### Docker Volumes
- `vulnsphere_postgres_data`: PostgreSQL data persistence
- `vulnsphere_api_media`: Uploaded files and reports

## 🚀 Deployment

### Production Deployment
```bash
# Using GitHub Actions
1. Fork and push to your repository
2. Configure repository secrets
3. GitHub Actions will automatically build and deploy

# Manual Deployment
docker compose -f compose.standalone.yaml up -d
```

### GitHub Container Registry
Images are automatically built and pushed to:
- `ghcr.io/your-username/vulnsphere-api`
- `ghcr.io/your-username/vulnsphere-frontend`

## 🔒 Security

### Authentication
- JWT-based authentication with configurable expiration
- Role-based access control (Admin, Tester, Client)
- Email/username login support
- Password strength requirements

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure file uploads

### Security Features
- Activity logging and audit trails
- Multi-tenant data isolation
- Encrypted password storage
- API rate limiting (configurable)

## 🧪 Testing

### Running Tests
```bash
# Backend tests
cd api
python manage.py test

# Frontend tests
cd frontend
npm test
```

### Test Coverage
- Unit tests for all models and views
- Integration tests for API endpoints
- Frontend component tests
- Security tests for authentication

## 📊 Monitoring

### Health Checks
- API health endpoint: `/api/v1/health/`
- Database connection monitoring
- Container health checks in Docker

### Logging
- Structured logging with JSON format
- Error tracking and alerting
- Performance monitoring
- Security event logging

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Style
- Python: PEP 8 compliance
- JavaScript: ESLint configuration
- CSS: Following BEM methodology
- Commits: Conventional commit messages

### Security Contributions
- Report security vulnerabilities privately
- Follow responsible disclosure
- Security patches prioritized

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- 📖 Check the [documentation](docs/)
- 🐛 [Report issues](https://github.com/your-username/VulnSphere/issues)
- 💬 [Discussions](https://github.com/your-username/VulnSphere/discussions)

### Quick Links
- [API Documentation](http://localhost:8000/api/docs/)
- [Admin Panel](http://localhost:8000/admin/)
- [Frontend Application](http://localhost:3000)

---

**VulnSphere** - Professional vulnerability management for security teams.
