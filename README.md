# VulnSphere

A comprehensive multi-tenant vulnerability reporting and management platform built with Django and React.

## 🚀 Features

### Core Functionality
- **Multi-Tenant Architecture**: Securely manage multiple clients with isolated data, projects, and assets for each company.
- **Vulnerability Management**: A complete lifecycle for tracking vulnerabilities from creation to resolution, including status updates, retesting, and risk assessment.
- **Asset Management**: Define and manage a wide range of assets, including web applications, servers, and mobile apps, and link them to specific projects and vulnerabilities.
- **Rich Text Editor**: A powerful and intuitive TipTap-based editor for detailed vulnerability descriptions, notes, and comments, with support for markdown, image uploads, and more.
- **Report Generation**: Generate professional and customizable security reports in DOCX and HTML formats using a flexible template system.
- **Role-Based Access Control (RBAC)**: Granular permissions for Admins, Testers, and Clients, ensuring users only have access to the information they need.
- **Activity Logging**: A comprehensive audit trail that logs all significant actions within the system for accountability and security.

### Technical Stack
- **Backend**: Django 6.0 with Django REST Framework
- **Frontend**: React with modern UI components
- **Database**: PostgreSQL with optimized migrations
- **Authentication**: JWT-based with email/username login
- **Containerization**: Docker with multi-architecture support
- **CI/CD**: GitHub Actions with automated testing and security scanning

### Key Features
- **Vulnerability Templates**: Over 500 pre-loaded templates for common vulnerabilities to speed up the reporting process.
- **Bulk Import/Export**: Easily import and export vulnerabilities and assets using CSV files.
- **Customizable Report Templates**: Create and manage your own DOCX and HTML report templates for consistent and professional branding.
- **Advanced Search and Filtering**: Quickly find the information you need with powerful search and filtering capabilities across all modules.
- **API-First Design**: A comprehensive REST API with OpenAPI/Swagger documentation for easy integration with other tools.
- **CVSS Scoring**: Utilize CVSS v3.1 for standardized and accurate vulnerability severity assessment.

### Rich Text Editor Features

VulnSphere includes a powerful and modern rich text editor based on **TipTap**, providing a seamless writing experience for vulnerability details, notes, and comments. Key features include:

- **Full Markdown Support**: Write in markdown and have it automatically converted to rich text.
- **Image Uploads**: Drag and drop or paste images directly into the editor, which are securely stored as attachments.
- **Code Blocks**: Syntax highlighting for a variety of programming languages to clearly display code snippets.
- **Text Formatting**: A full suite of formatting options, including headings, bold, italics, underline, strikethrough, and more.
- **Lists and Checklists**: Create ordered, unordered, and task lists to organize information.
- **Blockquotes and Horizontal Rules**: Structure your content for clarity and readability.
- **Link Management**: Easily add, edit, and remove hyperlinks.
- **Color Highlighting**: Use different colors to highlight important text.

## 📸 Screenshots
![Dashboard](https://i.postimg.cc/zGLjdnZb/Screenshot-2025-12-13-at-5-36-15-PM.png)
![Editor](https://i.postimg.cc/nh61NCnx/Screenshot-2025-12-13-at-5-36-51-PM.png)

## 🛠️ Installation

### Prerequisites
- Docker and Docker Compose

### Quick Start
```bash
# Download the compose file
mkdir /opt/VulnSphere && cd /opt/VulnSphere
wget https://raw.githubusercontent.com/xhzeem/VulnSphere/main/compose.standalone.yml

# Start all services
docker compose -f compose.standalone.yml up -d

# Access the application
# Frontend: http://localhost:3000
# Admin: http://localhost:8000/admin
# API Documentation: http://localhost:8000/api/docs/
# Default admin credentials:
#   Email: admin@example.com
#   Username: admin
#   Password: password
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

### Backend (Django)

1.  **Navigate to the `api` directory**:
    ```bash
    cd api
    ```
2.  **Create and activate a virtual environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```
3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run database migrations**:
    ```bash
    python manage.py migrate
    ```
5.  **Start the development server**:
    ```bash
    python manage.py runserver
    ```

### Frontend (React)

1.  **Navigate to the `frontend` directory**:
    ```bash
    cd frontend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the development server**:
    ```bash
    npm start
    ```


## 📚 API Documentation

VulnSphere provides a comprehensive REST API for managing all aspects of the platform. The base URL for the API is `/api/v1/`.

### Authentication

- **Login**: `POST /auth/login/`
- **Logout**: `POST /auth/logout/`
- **Get Current User**: `GET /users/me/`

### Core Endpoints

- **Companies**: `GET, POST /companies/`
  - `GET, PUT, PATCH, DELETE /companies/{companyId}/`
- **Projects**: `GET, POST /companies/{companyId}/projects/`
  - `GET, PUT, PATCH, DELETE /companies/{companyId}/projects/{projectId}/`
- **Assets**: `GET, POST /companies/{companyId}/assets/`
  - `GET, PUT, PATCH, DELETE /companies/{companyId}/assets/{assetId}/`
- **Vulnerabilities**: `GET, POST /companies/{companyId}/projects/{projectId}/vulnerabilities/`
  - `GET, PUT, PATCH, DELETE /companies/{companyId}/projects/{projectId}/vulnerabilities/{vulnId}/`

### Additional Endpoints

- **Comments**: `GET, POST /comments/` (filterable by vulnerability, project, etc.)
- **Attachments**: `GET, POST /companies/{companyId}/projects/{projectId}/attachments/`
- **Retests**: `GET, POST /companies/{companyId}/projects/{projectId}/vulnerabilities/{vulnId}/retests/`
- **Activity Logs**: `GET /activity-logs/` (Admin only)
- **Report Generation**: `POST /reports/generate/`
- **Vulnerability Templates**: `GET, POST /vulnerability-templates/`

For a complete and interactive API specification, please refer to the **Swagger/OpenAPI documentation** available at `/api/docs/`.

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

Security is a top priority for VulnSphere. The platform is designed with a multi-layered security approach to protect sensitive data.

### Authentication and Authorization

- **JWT-Based Authentication**: Secure, stateless authentication with configurable token expiration.
- **Role-Based Access Control (RBAC)**: Three distinct roles (Admin, Tester, Client) with granular permissions to ensure users can only access data and features relevant to their role.
- **Secure Password Policies**: Enforces strong password requirements and uses modern, secure hashing algorithms.

### Data Protection

- **Multi-Tenant Data Isolation**: A robust multi-tenancy model ensures that data for each company is completely isolated and cannot be accessed by other tenants.
- **Input Validation**: All incoming data is rigorously validated to prevent common web application vulnerabilities.
- **ORM-Level SQL Injection Protection**: Django's ORM is used for all database queries, providing built-in protection against SQL injection attacks.
- **XSS and CSRF Protection**: The platform includes measures to prevent Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) attacks.

### Secure Development and Operations

- **Secure File Uploads**: All file uploads are scanned and stored securely, with measures in place to prevent the execution of malicious files.
- **Comprehensive Audit Trails**: All significant actions are logged, providing a clear audit trail for security reviews and incident response.
- **Container Security**: The application is containerized using Docker, with best practices for image security and runtime isolation.

## 🧪 Testing

VulnSphere has a comprehensive test suite to ensure code quality and stability.

### Running Tests

-   **Backend (Django)**:
    ```bash
    cd api
    python manage.py test
    ```
-   **Frontend (React)**:
    ```bash
    cd frontend
    npm test
    ```

### Test Coverage

-   **Unit Tests**: Core business logic, models, and serializers are covered by unit tests.
-   **Integration Tests**: API endpoints are tested to ensure they behave as expected.
-   **Component Tests**: React components are tested to verify their functionality and rendering.
-   **Security Tests**: Specific tests for authentication, authorization, and other security features.

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
