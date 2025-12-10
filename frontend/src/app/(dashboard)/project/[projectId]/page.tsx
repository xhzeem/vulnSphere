'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VulnerabilityDeleteDialog } from '@/components/vulnerabilities/vulnerability-delete-dialog';
import { VulnerabilityCloneDialog } from '@/components/vulnerabilities/vulnerability-clone-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Copy, Shield, Search, Eye, Save, X } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { MDXEditorComponent } from '@/components/mdx-editor';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

const ITEMS_PER_PAGE = 10;

interface Project {
    id: string;
    title: string;
    engagement_type: string;
    status: string;
    start_date: string;
    end_date: string;
    summary: string;
    scope_description: string;
    company: string;
}

interface Vulnerability {
    id: string;
    title: string;
    code: string;
    severity: string;
    status: string;
    category: string;
    cvss_base_score: number | null;
}

interface Asset {
    id: string;
    name: string;
    type: string;
    identifier: string;
    environment: string;
    is_active: boolean;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;

    const [project, setProject] = useState<Project | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<Partial<Project>>({});
    const [saving, setSaving] = useState(false);

    const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [allAssets, setAllAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Vulnerability state
    const [vulnSearchQuery, setVulnSearchQuery] = useState('');
    const [vulnSeverityFilter, setVulnSeverityFilter] = useState('ALL');
    const [vulnStatusFilter, setVulnStatusFilter] = useState('ALL');
    const [vulnPage, setVulnPage] = useState(1);
    const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

    // Asset state
    const [assetSearchQuery, setAssetSearchQuery] = useState('');
    const [assetFilter, setAssetFilter] = useState('ALL');
    const [assetPage, setAssetPage] = useState(1);

    // Tab state
    const [activeTab, setActiveTab] = useState('vulnerabilities');

    const fetchProjectData = async () => {
        try {
            setLoading(true);
            const projectRes = await api.get(`/projects/${projectId}/`);
            setProject(projectRes.data);

            const companyId = projectRes.data.company;

            // Fetch vulnerabilities
            const vulnRes = await api.get(`/companies/${companyId}/projects/${projectId}/vulnerabilities/`);
            setVulnerabilities(vulnRes.data.results || vulnRes.data || []);

            // Fetch project assets (attached)
            const assetRes = await api.get(`/companies/${companyId}/projects/${projectId}/assets/`);
            setAssets(assetRes.data.results || assetRes.data || []);

            // Fetch all company assets
            const allAssetsRes = await api.get(`/companies/${companyId}/assets/`);
            setAllAssets(allAssetsRes.data.results || allAssetsRes.data || []);
        } catch (err: any) {
            console.error('Failed to fetch project data', err);
            setError('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjectData();
    }, [projectId]);

    // Filter vulnerabilities
    const filteredVulnerabilities = vulnerabilities.filter(vuln => {
        const matchesSearch = vuln.title.toLowerCase().includes(vulnSearchQuery.toLowerCase()) ||
            vuln.category.toLowerCase().includes(vulnSearchQuery.toLowerCase());
        const matchesSeverity = vulnSeverityFilter === 'ALL' || vuln.severity === vulnSeverityFilter;
        const matchesStatus = vulnStatusFilter === 'ALL' || vuln.status === vulnStatusFilter;

        return matchesSearch && matchesSeverity && matchesStatus;
    });

    const vulnStartIndex = (vulnPage - 1) * ITEMS_PER_PAGE;
    const paginatedVulnerabilities = filteredVulnerabilities.slice(vulnStartIndex, vulnStartIndex + ITEMS_PER_PAGE);

    // Filter assets
    const assetIds = new Set(assets.map(a => a.id));
    const filteredAssets = allAssets.filter(asset => {
        const matchesSearch = asset.name.toLowerCase().includes(assetSearchQuery.toLowerCase());
        const isAttached = assetIds.has(asset.id);

        if (assetFilter === 'ATTACHED') return isAttached && matchesSearch;
        if (assetFilter === 'UNATTACHED') return !isAttached && matchesSearch;
        return matchesSearch; // ALL
    });

    const assetStartIndex = (assetPage - 1) * ITEMS_PER_PAGE;
    const paginatedAssets = filteredAssets.slice(assetStartIndex, assetStartIndex + ITEMS_PER_PAGE);

    const handleAttachAsset = async (assetId: string) => {
        if (!project) return;
        try {
            await api.post(`/companies/${project.company}/projects/${projectId}/assets/`, { assetId });
            await fetchProjectData();
        } catch (err) {
            console.error('Failed to attach asset', err);
        }
    };

    const handleDetachAsset = async (assetId: string) => {
        if (!project) return;
        try {
            await api.delete(`/companies/${project.company}/projects/${projectId}/assets/${assetId}/`);
            await fetchProjectData();
        } catch (err) {
            console.error('Failed to detach asset', err);
        }
    };

    const handleSaveProject = async () => {
        if (!project) return;
        setSaving(true);
        try {
            const res = await api.patch(`/projects/${projectId}/`, editFormData);
            setProject(res.data);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update project', err);
            setError('Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const toggleEdit = () => {
        if (project) {
            setEditFormData({
                title: project.title,
                engagement_type: project.engagement_type,
                status: project.status,
                start_date: project.start_date,
                end_date: project.end_date,
                summary: project.summary,
                scope_description: project.scope_description // if needed
            });
            setIsEditing(true);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'destructive';
            case 'HIGH': return 'destructive';
            case 'MEDIUM': return 'default';
            case 'LOW': return 'secondary';
            case 'INFO': return 'outline';
            default: return 'outline';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'destructive';
            case 'IN_PROGRESS': return 'default';
            case 'RESOLVED': return 'outline';
            case 'ACCEPTED_RISK': return 'secondary';
            case 'FALSE_POSITIVE': return 'outline';
            default: return 'outline';
        }
    };

    if (error) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-destructive">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (loading || !project) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-12 w-full" />
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/companies/${project.company}`)}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        {isEditing ? (
                            <Input
                                value={editFormData.title || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                className="text-2xl font-bold h-10 w-full"
                            />
                        ) : (
                            <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
                        )}
                        {isEditing ? (
                            <Input
                                value={editFormData.engagement_type || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, engagement_type: e.target.value })}
                                className="mt-1 h-8 w-full"
                                placeholder="Engagement Type"
                            />
                        ) : (
                            <p className="text-muted-foreground">{project.engagement_type}</p>
                        )}
                    </div>
                </div>
                {isEditing ? (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                            <X className="mr-2 h-4 w-4" />
                            Cancel
                        </Button>
                        <Button onClick={handleSaveProject} disabled={saving}>
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={toggleEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Project
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Project Details</CardTitle>
                            <CardDescription>
                                {isEditing ? (
                                    <div className="flex gap-2 mt-2">
                                        <Input
                                            type="date"
                                            value={editFormData.start_date || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                                        />
                                        <span className="self-center">-</span>
                                        <Input
                                            type="date"
                                            value={editFormData.end_date || ''}
                                            onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                                        />
                                    </div>
                                ) : (
                                    <span>
                                        {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        {isEditing ? (
                            <Select
                                value={editFormData.status || project.status}
                                onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                                    <SelectItem value="FINAL">Final</SelectItem>
                                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge variant={getStatusColor(project.status)}>
                                {project.status.replace('_', ' ')}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="space-y-2">
                            <Label>Summary</Label>
                            <MDXEditorComponent
                                value={editFormData.summary || ''}
                                onChange={(v) => setEditFormData({ ...editFormData, summary: v })}
                            />
                        </div>
                    ) : (
                        project.summary && (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{project.summary}</ReactMarkdown>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="vulnerabilities">
                        <Shield className="mr-2 h-4 w-4" />
                        Vulnerabilities ({filteredVulnerabilities.length})
                    </TabsTrigger>
                    <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="vulnerabilities" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Vulnerabilities</CardTitle>
                                <Button onClick={() => router.push(`/project/${projectId}/vulnerabilities/new`)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Vulnerability
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search vulnerabilities..."
                                        value={vulnSearchQuery}
                                        onChange={(e) => {
                                            setVulnSearchQuery(e.target.value);
                                            setVulnPage(1);
                                        }}
                                        className="pl-8"
                                    />
                                </div>
                                <Select value={vulnSeverityFilter} onValueChange={setVulnSeverityFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Severity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Severities</SelectItem>
                                        <SelectItem value="CRITICAL">Critical</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="INFO">Info</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={vulnStatusFilter} onValueChange={setVulnStatusFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Statuses</SelectItem>
                                        <SelectItem value="OPEN">Open</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                                        <SelectItem value="ACCEPTED_RISK">Accepted Risk</SelectItem>
                                        <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {filteredVulnerabilities.length === 0 ? (
                                <div className="text-center py-12">
                                    <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No vulnerabilities yet</h3>
                                    <p className="text-muted-foreground mb-4">
                                        {vulnSearchQuery || vulnSeverityFilter !== 'ALL' || vulnStatusFilter !== 'ALL'
                                            ? 'No vulnerabilities match your filters.'
                                            : 'Add your first vulnerability to get started'}
                                    </p>
                                    {!(vulnSearchQuery || vulnSeverityFilter !== 'ALL' || vulnStatusFilter !== 'ALL') && (
                                        <Button onClick={() => router.push(`/project/${projectId}/vulnerabilities/new`)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Vulnerability
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Title</TableHead>
                                                <TableHead>Severity</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>CVSS</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedVulnerabilities.map((vuln) => (
                                                <TableRow key={vuln.id}>
                                                    <TableCell className="font-medium">{vuln.title}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getSeverityColor(vuln.severity)}>
                                                            {vuln.severity}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusColor(vuln.status)}>
                                                            {vuln.status.replace('_', ' ')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{vuln.cvss_base_score ? Number(vuln.cvss_base_score).toFixed(1) : 'N/A'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <Link href={`/project/${projectId}/vulnerabilities/${vuln.id}`}>
                                                                    <Eye className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button variant="ghost" size="sm" asChild>
                                                                <Link href={`/project/${projectId}/vulnerabilities/${vuln.id}/edit`}>
                                                                    <Pencil className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedVuln(vuln);
                                                                    setCloneDialogOpen(true);
                                                                }}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedVuln(vuln);
                                                                    setDeleteDialogOpen(true);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <TablePagination
                                        currentPage={vulnPage}
                                        totalItems={filteredVulnerabilities.length}
                                        itemsPerPage={ITEMS_PER_PAGE}
                                        onPageChange={setVulnPage}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="assets" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Assets</CardTitle>
                            <CardDescription>Manage assets associated with this project</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search assets..."
                                        value={assetSearchQuery}
                                        onChange={(e) => {
                                            setAssetSearchQuery(e.target.value);
                                            setAssetPage(1);
                                        }}
                                        className="pl-8"
                                    />
                                </div>
                                <Select value={assetFilter} onValueChange={setAssetFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Assets</SelectItem>
                                        <SelectItem value="ATTACHED">Attached</SelectItem>
                                        <SelectItem value="UNATTACHED">Not Attached</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {filteredAssets.length === 0 ? (
                                <div className="text-center py-12">
                                    <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">No assets found</p>
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Identifier</TableHead>
                                                <TableHead>Environment</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedAssets.map((asset) => {
                                                const isAttached = assetIds.has(asset.id);
                                                return (
                                                    <TableRow key={asset.id}>
                                                        <TableCell className="font-medium">{asset.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary">
                                                                {asset.type.replace('_', ' ')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{asset.identifier}</TableCell>
                                                        <TableCell>{asset.environment}</TableCell>
                                                        <TableCell className="text-right">
                                                            {isAttached ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDetachAsset(asset.id)}
                                                                >
                                                                    Detach
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleAttachAsset(asset.id)}
                                                                >
                                                                    Attach
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
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
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <VulnerabilityDeleteDialog
                vulnerability={selectedVuln}
                projectId={projectId}
                companyId={project.company}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onSuccess={fetchProjectData}
            />

            <VulnerabilityCloneDialog
                vulnerability={selectedVuln}
                projectId={projectId}
                companyId={project.company}
                open={cloneDialogOpen}
                onOpenChange={setCloneDialogOpen}
                onSuccess={fetchProjectData}
            />
        </div>
    );
}
