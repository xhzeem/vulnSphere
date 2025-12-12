'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EnhancedSelect } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TablePagination } from '@/components/ui/table-pagination';
import api from '@/lib/api';
import { ProjectEditDialog } from '@/components/projects/project-edit-dialog';
import { ProjectDeleteDialog } from '@/components/projects/project-delete-dialog';
import { ProjectCreateDialog } from '@/components/projects/project-create-dialog';
import { Search, Eye, Pencil, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatStatus } from '@/lib/formatters';

interface Company {
    id: string;
    name: string;
}

interface Project {
    id: string;
    title: string;
    company: string;
    engagement_type: string;
    status: string;
    start_date: string;
    end_date: string;
    summary: string;
    scope_description: string;
    created_at: string;
    vulnerability_count?: number;
}

export default function ProjectsPage() {
    const router = useRouter();
    const { isAdmin, canEdit } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Dialog state
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [page, search, selectedCompany, selectedStatus]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch companies
            const companiesRes = await api.get('/companies/');
            const companiesResponse = companiesRes.data.results || companiesRes.data;
            
            // Filter inactive companies for non-admin users
            const filteredCompanies = isAdmin ? companiesResponse : companiesResponse.filter((company: any) => company.is_active);
            setCompanies(filteredCompanies);

            // Build query params
            const params = new URLSearchParams({ page: page.toString(), page_size: '12' });
            if (search) params.append('search', search);

            // Fetch projects
            const projectsRes = await api.get(`/projects/?${params}`);
            const projectsData = projectsRes.data;

            let filteredProjects = projectsData.results || projectsData;
            
            // Filter projects to only show those from visible companies
            filteredProjects = filteredProjects.filter((p: Project) => 
                filteredCompanies.some((company: Company) => company.id === p.company)
            );

            // Client-side filtering for company and status
            if (selectedCompany !== 'all') {
                filteredProjects = filteredProjects.filter((p: Project) => p.company.toString() === selectedCompany);
            }
            if (selectedStatus !== 'all') {
                filteredProjects = filteredProjects.filter((p: Project) => p.status === selectedStatus);
            }

            // Fetch vulnerability counts for each project
            const projectsWithCounts = await Promise.all(
                filteredProjects.map(async (project: Project) => {
                    try {
                        const vulnsRes = await api.get(`/companies/${project.company}/projects/${project.id}/vulnerabilities/`);
                        const vulnsData = vulnsRes.data.results || vulnsRes.data;
                        return {
                            ...project,
                            vulnerability_count: Array.isArray(vulnsData) ? vulnsData.length : 0
                        };
                    } catch (error) {
                        console.error(`Failed to fetch vulnerabilities for project ${project.id}:`, error);
                        return {
                            ...project,
                            vulnerability_count: 0
                        };
                    }
                })
            );

            setProjects(projectsWithCounts);
            setTotalCount(projectsData.count || filteredProjects.length);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCompanyName = (companyId: string) => {
        return companies.find(c => c.id === companyId)?.name || `Company ${companyId}`;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            DRAFT: 'outline',
            IN_REVIEW: 'secondary',
            FINAL: 'default',
            ARCHIVED: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{formatStatus(status)}</Badge>;
    };

    const handleEdit = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setSelectedProject(project);
        setEditDialogOpen(true);
    };

    const handleDelete = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setSelectedProject(project);
        setDeleteDialogOpen(true);
    };

    const handleRowClick = (projectId: string) => {
        router.push(`/project/${projectId}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">All Projects</h2>
                    <p className="text-muted-foreground">
                        View and filter all projects across companies.
                    </p>
                </div>
                {canEdit && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Project
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search projects..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {companies.map((company) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                                {company.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <EnhancedSelect value={selectedStatus} onValueChange={setSelectedStatus} colorType="projectStatus">
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="DRAFT" color="#6b7280">Draft</SelectItem>
                        <SelectItem value="IN_REVIEW" color="#3b82f6">In Review</SelectItem>
                        <SelectItem value="FINAL" color="#22c55e">Final</SelectItem>
                        <SelectItem value="ARCHIVED" color="#f97316">Archived</SelectItem>
                    </SelectContent>
                </EnhancedSelect>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Engagement Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vulnerabilities</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 9 : 8} className="text-center py-8">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : projects.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 9 : 8} className="text-center py-8 text-gray-500">
                                    No projects found
                                </TableCell>
                            </TableRow>
                        ) : (
                            projects.map((project) => (
                                <TableRow
                                    key={project.id}
                                    onClick={() => handleRowClick(project.id)}
                                    className="cursor-pointer hover:bg-muted/50"
                                >
                                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">{project.title}</TableCell>
                                    <TableCell>{getCompanyName(project.company)}</TableCell>
                                    <TableCell>{project.engagement_type}</TableCell>
                                    <TableCell><ProjectStatusBadge status={project.status} /></TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                            {project.vulnerability_count || 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{new Date(project.start_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(project.end_date).toLocaleDateString()}</TableCell>
                                    {canEdit && (
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="sm" onClick={(e) => handleEdit(e, project)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={(e) => handleDelete(e, project)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

            <TablePagination
                currentPage={page}
                totalItems={totalCount}
                itemsPerPage={12}
                onPageChange={setPage}
            />

            <ProjectEditDialog
                project={selectedProject}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={fetchData}
            />

            <ProjectDeleteDialog
                project={selectedProject}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onSuccess={fetchData}
            />

            <ProjectCreateDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={fetchData}
            />
        </div>
    );
}
