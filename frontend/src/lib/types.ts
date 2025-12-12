export interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'TESTER' | 'CLIENT';
    companies: string[]; // Array of company IDs
}

export interface Company {
    id: string;
    name: string;
    slug: string;
    contact_email?: string;
    address?: string;
    notes?: string;
    is_active?: boolean;
    created_at?: string;
    project_count?: number;
    asset_count?: number;
}

export interface Project {
    id: string;
    title: string;
    company: string; // company ID
    status?: string;
    engagement_type?: string;
    start_date?: string;
    end_date?: string;
    summary?: string;
    scope_description?: string;
    created_at?: string;
}

export interface Asset {
    id: string;
    name: string;
    type: string;
    identifier: string;
    environment: string;
    is_active: boolean;
    company: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    file: string; // URL
    created_at: string;
    updated_at: string;
}

export interface GeneratedReport {
    id: string;
    project?: string; // ID
    company?: string; // ID
    template: string; // ID
    template_name?: string; // Name of the template
    project_title?: string; // Title of the project
    company_name?: string; // Name of the company
    file: string; // URL
    format: 'DOCX' | 'HTML';
    is_failed: boolean;
    error_message?: string;
    created_at: string;
}

export interface Comment {
    id: string;
    company: string;
    project?: string;
    vulnerability?: string;
    retest?: string;
    author: string;
    author_name?: string;
    body_md: string;
    is_internal: boolean;
    created_at: string;
    updated_at: string;
}

export interface Vulnerability {
    id: string;
    title: string;
    severity: string;
    status: string;
    cvss_base_score: number | null;
    cvss_vector: string;
    details_md: string;
    details_html?: string; // For templates that use HTML instead of markdown
    references: string[];
    created_at: string;
    updated_at: string;
    category?: string;
    cve_id?: string;
    affected_asset?: string;
    recommendation?: string;
}
