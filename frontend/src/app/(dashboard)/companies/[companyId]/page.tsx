'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
import { Plus, FileText, Server, Pencil, Trash2, Eye, Save, X } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const ITEMS_PER_PAGE = 10;

interface Company {
    id: string;
    name: string;
    slug: string;
    contact_email: string;
    address: string;
    notes: string;
    is_active: boolean;
    created_at: string;
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
}

interface Asset {
    id: string;
    company: string;
    name: string;
    type: string;
    identifier: string;
    environment: string;
    description: string;
    is_active: boolean;
}

export default function CompanyDetailPage() {
    const params = useParams();
    const companyId = params.companyId as string;

    const [company, setCompany] = useState<Company | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Company>>({});
    const [saving, setSaving] = useState(false);

    // Tab state
    const [activeTab, setActiveTab] = useState('projects');

    const fetchCompanyData = async () => {
        try {
            setLoading(true);
            const [companyRes, projectsRes, assetsRes] = await Promise.all([
                api.get(`/companies/${companyId}/`),
                api.get(`/companies/${companyId}/projects/`),
                api.get(`/companies/${companyId}/assets/`),
            ]);

            setCompany(companyRes.data);
            setProjects(projectsRes.data.results || projectsRes.data);
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

    const handleProjectEdit = (project: Project) => {
        setSelectedProject(project);
        setProjectEditDialogOpen(true);
    };

    const handleProjectDelete = (project: Project) => {
        setSelectedProject(project);
        setProjectDeleteDialogOpen(true);
    };

    const handleAssetEdit = (asset: Asset) => {
        setSelectedAsset(asset);
        setAssetEditDialogOpen(true);
    };

    const handleAssetDelete = (asset: Asset) => {
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
        const labels: Record<string, string> = {
            'WEB_APP': 'Web App',
            'API': 'API',
            'SERVER': 'Server',
            'MOBILE_APP': 'Mobile App',
            'NETWORK_DEVICE': 'Network Device',
            'OTHER': 'Other'
        };
        return labels[type] || type;
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

    // Pagination logic
    const projectStartIndex = (projectPage - 1) * ITEMS_PER_PAGE;
    const paginatedProjects = projects.slice(projectStartIndex, projectStartIndex + ITEMS_PER_PAGE);

    const assetStartIndex = (assetPage - 1) * ITEMS_PER_PAGE;
    const paginatedAssets = assets.slice(assetStartIndex, assetStartIndex + ITEMS_PER_PAGE);

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
                    {isEditing ? (
                        <div className="space-y-2">
                            <Input
                                value={editFormData.name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="text-3xl font-bold h-12 w-full"
                                placeholder="Company Name"
                            />
                            <Input
                                value={editFormData.contact_email || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                                className="w-full max-w-md"
                                placeholder="Contact Email"
                            />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                            <p className="text-muted-foreground">{company.contact_email}</p>
                        </>
                    )}
                </div>
                {isEditing ? (
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
                ) : (
                    <Button variant="outline" onClick={toggleEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Company
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div>
                        <span className="text-sm font-medium">Address:</span>
                        {isEditing ? (
                            <Textarea
                                value={editFormData.address || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                placeholder="Address"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">{company.address || 'N/A'}</p>
                        )}
                    </div>
                    <div>
                        <span className="text-sm font-medium">Notes:</span>
                        {isEditing ? (
                            <Textarea
                                value={editFormData.notes || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                                placeholder="Internal Notes"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">{company.notes || 'N/A'}</p>
                        )}
                    </div>
                    <div>
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={company.is_active ? 'outline' : 'secondary'} className="ml-2">
                            {company.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
                    <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="projects" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Projects</h2>
                        <Button onClick={() => setProjectDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Project
                        </Button>
                    </div>

                    {projects.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                                <p className="text-muted-foreground mb-4">Create your first project to get started</p>
                                <Button onClick={() => setProjectDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Project
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Dates</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedProjects.map((project) => (
                                            <TableRow key={project.id}>
                                                <TableCell className="font-medium">{project.title}</TableCell>
                                                <TableCell>{project.engagement_type}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusColor(project.status)}>
                                                        {project.status.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <Link href={`/project/${project.id}`}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleProjectEdit(project)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleProjectDelete(project)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    currentPage={projectPage}
                                    totalItems={projects.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setProjectPage}
                                />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="assets" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Assets</h2>
                        <Button onClick={() => setAssetDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Asset
                        </Button>
                    </div>

                    {assets.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No assets yet</h3>
                                <p className="text-muted-foreground mb-4">Add an asset to track in this company</p>
                                <Button onClick={() => setAssetDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Asset
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Identifier</TableHead>
                                            <TableHead>Environment</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedAssets.map((asset) => (
                                            <TableRow key={asset.id}>
                                                <TableCell className="font-medium">{asset.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{getTypeLabel(asset.type)}</Badge>
                                                </TableCell>
                                                <TableCell>{asset.identifier}</TableCell>
                                                <TableCell>{asset.environment}</TableCell>
                                                <TableCell>
                                                    {asset.is_active ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => handleAssetEdit(asset)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleAssetDelete(asset)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    currentPage={assetPage}
                                    totalItems={assets.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setAssetPage}
                                />
                            </CardContent>
                        </Card>
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
        </div>

    );
}
