'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectCreateDialog } from '@/components/projects/project-create-dialog';
import { ProjectEditDialog } from '@/components/projects/project-edit-dialog';
import { ProjectDeleteDialog } from '@/components/projects/project-delete-dialog';
import { AssetCreateDialog } from '@/components/assets/asset-create-dialog';
import { AssetEditDialog } from '@/components/assets/asset-edit-dialog';
import { AssetDeleteDialog } from '@/components/assets/asset-delete-dialog';
import { Plus, FileText, Server, Pencil, Trash2, Eye, Save, X, Upload, TrendingUp, Users, Shield, Activity } from 'lucide-react';
import { CSVImportDialog } from '@/components/ui/csv-import-dialog';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EnhancedSelect } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatStatus, formatAssetType } from '@/lib/formatters';
import { useAuth } from '@/hooks/use-auth';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { AssetStatusBadge } from '@/components/assets/asset-status-badge';
import { CompanyStatusBadge } from '@/components/companies/company-status-badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const ITEMS_PER_PAGE = 15;

interface Company {
    id: string;
    name: string;
    contact_email: string;
    address: string;
    notes: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface Project {
    id: string;
    company: string;
    title: string;
    status: string;
    engagement_type: string;
    start_date: string;
    end_date: string;
    summary: string;
    created_at: string;
    vulnerability_count?: number;
}

interface Asset {
    id: string;
    company: string;
    name: string;
    type: string;
    identifier: string;
    description: string;
    is_active: boolean;
}

export default function CompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const companyId = params.companyId as string;
    const { isAdmin, canEdit } = useAuth();

    const [company, setCompany] = useState<Company | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [projectStatusFilter, setProjectStatusFilter] = useState('all');
    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [assetStatusFilter, setAssetStatusFilter] = useState('all');
    const [assetTypeFilter, setAssetTypeFilter] = useState('all');

    const [projectDialogOpen, setProjectDialogOpen] = useState(false);
    const [projectEditDialogOpen, setProjectEditDialogOpen] = useState(false);
    const [projectDeleteDialogOpen, setProjectDeleteDialogOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [projectPage, setProjectPage] = useState(1);

    const [assetDialogOpen, setAssetDialogOpen] = useState(false);
    const [assetEditDialogOpen, setAssetEditDialogOpen] = useState(false);
    const [assetDeleteDialogOpen, setAssetDeleteDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [assetPage, setAssetPage] = useState(1);
    const [assetImportDialogOpen, setAssetImportDialogOpen] = useState(false);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Company>>({});
    const [saving, setSaving] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState('overview');

    const fetchCompanyData = async () => {
        try {
            setLoading(true);
            const [companyRes, projectsRes, assetsRes] = await Promise.all([
                api.get(`/companies/${companyId}/`),
                api.get(`/companies/${companyId}/projects/`),
                api.get(`/companies/${companyId}/assets/`),
            ]);

            const companyData = companyRes.data;
            
            // Check if user is admin and if company is inactive
            if (!isAdmin && !companyData.is_active) {
                setError('Company not found');
                return;
            }

            setCompany(companyData);
            const projectsData = projectsRes.data.results || projectsRes.data;
            
            // Fetch vulnerability counts for each project
            const projectsWithCounts = await Promise.all(
                projectsData.map(async (project: Project) => {
                    try {
                        const vulnsRes = await api.get(`/companies/${companyId}/projects/${project.id}/vulnerabilities/`);
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
            setAssets(assetsRes.data.results || assetsRes.data);
        } catch (err: any) {
            console.error("Failed to fetch company data", err);
            setError('Failed to load company details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanyData();
    }, [companyId]);

    const handleProjectEdit = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setSelectedProject(project);
        setProjectEditDialogOpen(true);
    };

    const handleProjectDelete = (e: React.MouseEvent, project: Project) => {
        e.stopPropagation();
        setSelectedProject(project);
        setProjectDeleteDialogOpen(true);
    };

    const handleProjectRowClick = (projectId: string) => {
        router.push(`/project/${projectId}`);
    };

    const handleAssetEdit = (e: React.MouseEvent, asset: Asset) => {
        e.stopPropagation();
        setSelectedAsset(asset);
        setAssetEditDialogOpen(true);
    };

    const handleAssetDelete = (e: React.MouseEvent, asset: Asset) => {
        e.stopPropagation();
        setSelectedAsset(asset);
        setAssetDeleteDialogOpen(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'secondary';
            case 'IN_REVIEW': return 'default';
            case 'FINAL': return 'outline';
            case 'ARCHIVED': return 'outline';
            default: return 'secondary';
        }
    };

    const getTypeLabel = (type: string) => {
        return formatAssetType(type);
    };

    const handleSaveCompany = async () => {
        if (!company) return;
        setSaving(true);
        try {
            const res = await api.patch(`/companies/${companyId}/`, editFormData);
            setCompany(res.data);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update company', err);
            setError('Failed to update company');
        } finally {
            setSaving(false);
        }
    };

    const toggleEdit = () => {
        if (company) {
            setEditFormData({
                name: company.name,
                contact_email: company.contact_email,
                address: company.address,
                notes: company.notes,
                is_active: company.is_active
            });
            setIsEditing(true);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-64" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    // Filtering logic
    const getFilteredProjects = () => {
        let filtered = projects;

        if (projectSearchQuery) {
            const query = projectSearchQuery.toLowerCase();
            filtered = filtered.filter(project =>
                project.title.toLowerCase().includes(query) ||
                project.engagement_type.toLowerCase().includes(query)
            );
        }

        if (projectStatusFilter !== 'all') {
            filtered = filtered.filter(project => project.status === projectStatusFilter);
        }

        return filtered;
    };

    const getFilteredAssets = () => {
        let filtered = assets;

        if (assetSearchQuery) {
            const query = assetSearchQuery.toLowerCase();
            filtered = filtered.filter(asset =>
                asset.name.toLowerCase().includes(query) ||
                asset.identifier.toLowerCase().includes(query) ||
                asset.description.toLowerCase().includes(query)
            );
        }

        if (assetStatusFilter !== 'all') {
            const isActive = assetStatusFilter === 'active';
            filtered = filtered.filter(asset => asset.is_active === isActive);
        }

        if (assetTypeFilter !== 'all') {
            filtered = filtered.filter(asset => asset.type === assetTypeFilter);
        }

        return filtered;
    };

    // Pagination logic
    const filteredProjects = getFilteredProjects();
    const filteredAssets = getFilteredAssets();
    
    const projectStartIndex = (projectPage - 1) * ITEMS_PER_PAGE;
    const paginatedProjects = filteredProjects.slice(projectStartIndex, projectStartIndex + ITEMS_PER_PAGE);

    const assetStartIndex = (assetPage - 1) * ITEMS_PER_PAGE;
    const paginatedAssets = filteredAssets.slice(assetStartIndex, assetStartIndex + ITEMS_PER_PAGE);

    if (error || !company) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <p className="text-destructive">{error || 'Company not found'}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex-1 mr-4">
                    <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-muted-foreground">{company.contact_email}</p>
                        <CompanyStatusBadge status={company.is_active} />
                    </div>
                </div>
                {!isEditing && canEdit && (
                    <Button variant="outline" onClick={toggleEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Company
                    </Button>
                )}
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
                                <p className="text-2xl font-bold">{projects.length}</p>
                            </div>
                            <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                                <p className="text-2xl font-bold">{assets.length}</p>
                            </div>
                            <Server className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Vulnerabilities</p>
                                <p className="text-2xl font-bold">
                                    {projects.reduce((sum, project) => sum + (project.vulnerability_count || 0), 0)}
                                </p>
                            </div>
                            <Shield className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active Assets</p>
                                <p className="text-2xl font-bold">
                                    {assets.filter(asset => asset.is_active).length}
                                </p>
                            </div>
                            <Activity className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Projects by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={[
                                { status: 'Draft', count: projects.filter(p => p.status === 'DRAFT').length },
                                { status: 'In Review', count: projects.filter(p => p.status === 'IN_REVIEW').length },
                                { status: 'Final', count: projects.filter(p => p.status === 'FINAL').length },
                                { status: 'Archived', count: projects.filter(p => p.status === 'ARCHIVED').length },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="status" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Asset Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Web App', value: assets.filter(a => a.type === 'WEB_APP').length },
                                        { name: 'API', value: assets.filter(a => a.type === 'API').length },
                                        { name: 'Server', value: assets.filter(a => a.type === 'SERVER').length },
                                        { name: 'Mobile App', value: assets.filter(a => a.type === 'MOBILE_APP').length },
                                        { name: 'Network Device', value: assets.filter(a => a.type === 'NETWORK_DEVICE').length },
                                        { name: 'Other', value: assets.filter(a => a.type === 'OTHER').length },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.name}: ${entry.value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    <Cell fill="#0088FE" />
                                    <Cell fill="#00C49F" />
                                    <Cell fill="#FFBB28" />
                                    <Cell fill="#FF8042" />
                                    <Cell fill="#8884D8" />
                                    <Cell fill="#82CA9D" />
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
                    <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Projects */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Recent Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {projects.slice(0, 5).map((project) => (
                                        <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                                             onClick={() => handleProjectRowClick(project.id)}>
                                            <div className="flex-1">
                                                <h4 className="font-medium">{project.title}</h4>
                                                <p className="text-sm text-muted-foreground">{project.engagement_type}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ProjectStatusBadge status={project.status} />
                                                <Badge variant="secondary">{project.vulnerability_count || 0} vulns</Badge>
                                            </div>
                                        </div>
                                    ))}
                                    {projects.length === 0 && (
                                        <p className="text-center text-muted-foreground py-4">No projects yet</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Assets */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Server className="h-5 w-5" />
                                    Recent Assets
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {assets.slice(0, 5).map((asset) => (
                                        <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                                            <div className="flex-1">
                                                <h4 className="font-medium">{asset.name}</h4>
                                                <p className="text-sm text-muted-foreground">{asset.identifier}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{getTypeLabel(asset.type)}</Badge>
                                                <AssetStatusBadge status={asset.is_active} />
                                            </div>
                                        </div>
                                    ))}
                                    {assets.length === 0 && (
                                        <p className="text-center text-muted-foreground py-4">No assets yet</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Company Information</CardTitle>
                                </div>
                                {isEditing && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                                            <X className="mr-2 h-4 w-4" />
                                            Cancel
                                        </Button>
                                        <Button onClick={handleSaveCompany} disabled={saving}>
                                            <Save className="mr-2 h-4 w-4" />
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Label htmlFor="edit-name">Company Name *</Label>
                                    {isEditing ? (
                                        <Input
                                            id="edit-name"
                                            value={editFormData.name || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                            placeholder="Company Name"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium mt-1">{company.name}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="edit-contact-email">Contact Email *</Label>
                                    {isEditing ? (
                                        <Input
                                            id="edit-contact-email"
                                            type="email"
                                            value={editFormData.contact_email || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                                            placeholder="Contact Email"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium mt-1">{company.contact_email}</p>
                                    )}
                                </div>
                                <div>
                                    <Label htmlFor="edit-address">Address</Label>
                                    {isEditing ? (
                                        <Input
                                            id="edit-address"
                                            value={editFormData.address || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                            placeholder="Address"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium mt-1">{company.address || 'N/A'}</p>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="edit-notes">Notes</Label>
                                {isEditing ? (
                                    <Textarea
                                        id="edit-notes"
                                        value={editFormData.notes || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                        placeholder="Internal Notes"
                                        rows={3}
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground mt-1">{company.notes || 'N/A'}</p>
                                )}
                            </div>
                            {isEditing && (
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <Switch
                                            id="edit-is-active"
                                            checked={editFormData.is_active || false}
                                            onCheckedChange={(checked: boolean) => setEditFormData({ ...editFormData, is_active: checked })}
                                        />
                                        <Label htmlFor="edit-is-active">
                                            {editFormData.is_active ? 'Active' : 'Inactive'}
                                        </Label>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Inactive companies will be hidden from clients and testers.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-xl font-semibold">Projects</h2>
                        {canEdit && (
                            <Button onClick={() => setProjectDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Project
                            </Button>
                        )}
                    </div>
                    
                    {/* Project Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search projects..."
                                value={projectSearchQuery}
                                onChange={(e) => {
                                    setProjectSearchQuery(e.target.value);
                                    setProjectPage(1); // Reset to first page on search
                                }}
                                className="pl-8"
                            />
                        </div>
                        <EnhancedSelect value={projectStatusFilter} onValueChange={(value: string) => {
                            setProjectStatusFilter(value);
                            setProjectPage(1); // Reset to first page on filter
                        }} colorType="projectStatus">
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

                    {filteredProjects.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">
                                    {projectSearchQuery || projectStatusFilter !== 'all' ? 'No projects match your filters' : 'No projects yet'}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    {projectSearchQuery || projectStatusFilter !== 'all' 
                                        ? 'Try adjusting your search or filters' 
                                        : 'Create your first project to get started'}
                                </p>
                                {!projectSearchQuery && projectStatusFilter === 'all' && canEdit && (
                                    <Button onClick={() => setProjectDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Project
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedProjects.map((project) => (
                                <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow"
                                      onClick={() => handleProjectRowClick(project.id)}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                                                <p className="text-sm text-muted-foreground mt-1">{project.engagement_type}</p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <ProjectStatusBadge status={project.status} />
                                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    {project.vulnerability_count || 0} vulns
                                                </Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                <p>{new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}</p>
                                            </div>
                                            {canEdit && (
                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Button variant="outline" size="sm" className="flex-1" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleProjectEdit(e, project);
                                                            }}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="flex-1" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleProjectDelete(e, project);
                                                            }}>
                                                        <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                    {filteredProjects.length > 0 && (
                        <TablePagination
                            currentPage={projectPage}
                            totalItems={filteredProjects.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setProjectPage}
                        />
                    )}
                </TabsContent>

                <TabsContent value="assets" className="space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-xl font-semibold">Assets</h2>
                        {canEdit && (
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setAssetImportDialogOpen(true)}>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Import CSV
                                </Button>
                                <Button onClick={() => setAssetDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Asset
                                </Button>
                            </div>
                        )}
                    </div>
                    
                    {/* Asset Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search assets..."
                                value={assetSearchQuery}
                                onChange={(e) => {
                                    setAssetSearchQuery(e.target.value);
                                    setAssetPage(1); // Reset to first page on search
                                }}
                                className="pl-8"
                            />
                        </div>
                        <EnhancedSelect value={assetStatusFilter} onValueChange={(value: string) => {
                            setAssetStatusFilter(value);
                            setAssetPage(1); // Reset to first page on filter
                        }} colorType="assetStatus">
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active" color="#22c55e">Active</SelectItem>
                                <SelectItem value="inactive" color="#ef4444">Inactive</SelectItem>
                            </SelectContent>
                        </EnhancedSelect>
                        <Select value={assetTypeFilter} onValueChange={(value: string) => {
                            setAssetTypeFilter(value);
                            setAssetPage(1); // Reset to first page on filter
                        }}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="WEB_APP">Web Application</SelectItem>
                                <SelectItem value="API">API</SelectItem>
                                <SelectItem value="SERVER">Server</SelectItem>
                                <SelectItem value="MOBILE_APP">Mobile Application</SelectItem>
                                <SelectItem value="NETWORK_DEVICE">Network Device</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {filteredAssets.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">
                                    {assetSearchQuery || assetStatusFilter !== 'all' || assetTypeFilter !== 'all' 
                                        ? 'No assets match your filters' 
                                        : 'No assets yet'}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    {assetSearchQuery || assetStatusFilter !== 'all' || assetTypeFilter !== 'all'
                                        ? 'Try adjusting your search or filters'
                                        : 'Add an asset to track in this company'}
                                </p>
                                {!assetSearchQuery && assetStatusFilter === 'all' && assetTypeFilter === 'all' && canEdit && (
                                    <Button onClick={() => setAssetDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Asset
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Identifier</TableHead>
                                        <TableHead>Status</TableHead>
                                        {canEdit && <TableHead className="text-right">Actions</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedAssets.map((asset) => (
                                        <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50">
                                            <TableCell className="font-medium">{asset.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{getTypeLabel(asset.type)}</Badge>
                                            </TableCell>
                                            <TableCell>{asset.identifier}</TableCell>
                                            <TableCell>
                                                <AssetStatusBadge status={asset.is_active} />
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={(e) => handleAssetEdit(e, asset)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={(e) => handleAssetDelete(e, asset)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination
                                currentPage={assetPage}
                                totalItems={filteredAssets.length}
                                itemsPerPage={ITEMS_PER_PAGE}
                                onPageChange={setAssetPage}
                            />
                        </>
                    )}
                </TabsContent>
            </Tabs>

            <ProjectCreateDialog
                companyId={companyId}
                open={projectDialogOpen}
                onOpenChange={setProjectDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <ProjectEditDialog
                project={selectedProject}
                open={projectEditDialogOpen}
                onOpenChange={setProjectEditDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <ProjectDeleteDialog
                project={selectedProject}
                open={projectDeleteDialogOpen}
                onOpenChange={setProjectDeleteDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <AssetCreateDialog
                companyId={companyId}
                open={assetDialogOpen}
                onOpenChange={setAssetDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <AssetEditDialog
                asset={selectedAsset}
                open={assetEditDialogOpen}
                onOpenChange={setAssetEditDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <AssetDeleteDialog
                asset={selectedAsset}
                open={assetDeleteDialogOpen}
                onOpenChange={setAssetDeleteDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <CSVImportDialog
                open={assetImportDialogOpen}
                onOpenChange={setAssetImportDialogOpen}
                onSuccess={fetchCompanyData}
                title="Import Assets"
                description="Upload a CSV file to bulk import assets."
                templateEndpoint={`/companies/${companyId}/assets/csv-template/`}
                importEndpoint={`/companies/${companyId}/assets/bulk-import/`}
            />
        </div>

    );
}
