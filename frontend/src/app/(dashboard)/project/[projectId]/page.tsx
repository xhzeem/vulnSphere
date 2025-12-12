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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EnhancedSelect } from '@/components/ui/select';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';
import { AssetStatusBadge } from '@/components/assets/asset-status-badge';
import { VulnerabilityDeleteDialog } from '@/components/vulnerabilities/vulnerability-delete-dialog';
import { VulnerabilityCloneDialog } from '@/components/vulnerabilities/vulnerability-clone-dialog';
import { ArrowLeft, Plus, Pencil, Trash2, Copy, Shield, Search, Eye, Save, X, FileText, Minus, AlertCircle, Clock, CheckCircle, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import { SimpleRenderer } from '@/components/tiptap-templates/simple/simple-renderer';
import { format } from 'date-fns';
import { Vulnerability, Asset, Project, ReportTemplate } from '@/lib/types';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SeverityBadge } from '@/components/vulnerabilities/severity-badge';
import { StatusBadge } from '@/components/vulnerabilities/status-badge';
import { useAuth } from '@/hooks/use-auth';

const ITEMS_PER_PAGE = 15;

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const { canEdit, isClient } = useAuth();

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
    const [assetStatusFilter, setAssetStatusFilter] = useState('all');
    const [assetPage, setAssetPage] = useState(1);

    // Tab state
    const [activeTab, setActiveTab] = useState('vulnerabilities');

    // Report generation state
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [generating, setGenerating] = useState(false);
    const [reportError, setReportError] = useState('');

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

    useEffect(() => {
        if (reportDialogOpen) {
            fetchTemplates();
        }
    }, [reportDialogOpen]);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/report-templates/');
            setTemplates(Array.isArray(res.data) ? res.data : (res.data.results || []));
        } catch (err) {
            console.error('Failed to fetch templates', err);
        }
    };

    const handleGenerateReport = async () => {
        if (!selectedTemplate) {
            setReportError('Please select a template.');
            return;
        }

        setGenerating(true);
        setReportError('');

        try {
            await api.post('/generated-reports/generate/', {
                template_id: selectedTemplate,
                project_id: projectId,
            });
            setReportDialogOpen(false);
            setSelectedTemplate('');
            // Optionally show success message or redirect
        } catch (err: any) {
            console.error(err);
            setReportError(err.response?.data?.detail || err.response?.data?.error || 'Failed to generate report.');
        } finally {
            setGenerating(false);
        }
    };

    // Filter vulnerabilities
    const filteredVulnerabilities = vulnerabilities.filter(vuln => {
        const matchesSearch = vuln.title.toLowerCase().includes(vulnSearchQuery.toLowerCase()) ||
            (vuln.category && vuln.category.toLowerCase().includes(vulnSearchQuery.toLowerCase()));
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

        // Status filter
        if (assetStatusFilter !== 'all') {
            const isActive = assetStatusFilter === 'active';
            if (asset.is_active !== isActive) return false;
        }

        // For clients, only show attached assets
        if (isClient) {
            return isAttached && matchesSearch;
        }

        // For non-clients, use the attachment filter
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

    const handleAttachAllAssets = async () => {
        if (!project) return;
        try {
            await api.post(`/companies/${project.company}/projects/${projectId}/assets/attach_all/`);
            await fetchProjectData();
        } catch (err) {
            console.error('Failed to attach all assets', err);
        }
    };

    const handleDetachAllAssets = async () => {
        if (!project) return;
        try {
            await api.post(`/companies/${project.company}/projects/${projectId}/assets/detach_all/`);
            await fetchProjectData();
        } catch (err) {
            console.error('Failed to detach all assets', err);
        }
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
                        <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-muted-foreground">{project.engagement_type}</p>
                            <ProjectStatusBadge status={project.status || 'DRAFT'} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isClient && (
                        <Button variant="outline" onClick={toggleEdit}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Project
                        </Button>
                    )}
                    {!isClient && (
                        <Button onClick={() => setReportDialogOpen(true)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Generate Report
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Project Details</CardTitle>
                        </div>
                        {isEditing && (
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
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-title">Project Title *</Label>
                            {isEditing ? (
                                <Input
                                    id="edit-title"
                                    value={editFormData.title || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    placeholder="Project Title"
                                />
                            ) : (
                                <p className="text-sm font-medium mt-1">{project.title}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="edit-engagement-type">Engagement Type *</Label>
                            {isEditing ? (
                                <Input
                                    id="edit-engagement-type"
                                    value={editFormData.engagement_type || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, engagement_type: e.target.value })}
                                    placeholder="Engagement Type"
                                />
                            ) : (
                                <p className="text-sm font-medium mt-1">{project.engagement_type}</p>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="edit-start-date">Start Date *</Label>
                            {isEditing ? (
                                <Input
                                    id="edit-start-date"
                                    type="date"
                                    value={editFormData.start_date || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                                />
                            ) : (
                                <p className="text-sm font-medium mt-1">{project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}</p>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="edit-end-date">End Date *</Label>
                            {isEditing ? (
                                <Input
                                    id="edit-end-date"
                                    type="date"
                                    value={editFormData.end_date || ''}
                                    onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                                />
                            ) : (
                                <p className="text-sm font-medium mt-1">{project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}</p>
                            )}
                        </div>
                    </div>
                    {isEditing && (
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <EnhancedSelect
                                value={editFormData.status || project.status}
                                onValueChange={(v: string) => setEditFormData({ ...editFormData, status: v })}
                                colorType="projectStatus"
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT" color="#6b7280">Draft</SelectItem>
                                    <SelectItem value="IN_REVIEW" color="#3b82f6">In Review</SelectItem>
                                    <SelectItem value="FINAL" color="#22c55e">Final</SelectItem>
                                    <SelectItem value="ARCHIVED" color="#f97316">Archived</SelectItem>
                                </SelectContent>
                            </EnhancedSelect>
                        </div>
                    )}
                    <div>
                        <Label>Summary</Label>
                        {isEditing ? (
                            <SimpleEditor
                                content={editFormData.summary || ''}
                                onChange={(v) => setEditFormData({ ...editFormData, summary: v })}
                                height={200}
                            />
                        ) : (
                            project.summary && (
                                <div className="mt-2">
                                    <SimpleRenderer content={project.summary} />
                                </div>
                            )
                        )}
                    </div>
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
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Vulnerabilities</h2>
                        {!isClient && (
                            <Button onClick={() => router.push(`/project/${projectId}/vulnerabilities/new`)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Vulnerability
                            </Button>
                        )}
                    </div>

                    <div className="space-y-4">
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
                            <EnhancedSelect value={vulnSeverityFilter} onValueChange={setVulnSeverityFilter} colorType="severity">
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Severity" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Severities</SelectItem>
                                    <SelectItem value="CRITICAL" color="#ef4444">Critical</SelectItem>
                                    <SelectItem value="HIGH" color="#f97316">High</SelectItem>
                                    <SelectItem value="MEDIUM" color="#eab308">Medium</SelectItem>
                                    <SelectItem value="LOW" color="#3b82f6">Low</SelectItem>
                                    <SelectItem value="INFO" color="#22c55e">Info</SelectItem>
                                    <SelectItem value="UNCLASSIFIED" color="#6b7280">Unclassified</SelectItem>
                                </SelectContent>
                            </EnhancedSelect>
                            <EnhancedSelect value={vulnStatusFilter} onValueChange={setVulnStatusFilter} colorType="status">
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="DRAFT" icon={<FileText className="w-3 h-3" style={{ color: '#6b7280' }} />}>Draft</SelectItem>
                                    <SelectItem value="OPEN" icon={<AlertCircle className="w-3 h-3" style={{ color: '#ef4444' }} />}>Open</SelectItem>
                                    <SelectItem value="IN_PROGRESS" icon={<Clock className="w-3 h-3" style={{ color: '#3b82f6' }} />}>In Progress</SelectItem>
                                    <SelectItem value="RESOLVED" icon={<CheckCircle className="w-3 h-3" style={{ color: '#22c55e' }} />}>Resolved</SelectItem>
                                    <SelectItem value="ACCEPTED_RISK" icon={<AlertTriangle className="w-3 h-3" style={{ color: '#eab308' }} />}>Accepted Risk</SelectItem>
                                    <SelectItem value="FALSE_POSITIVE" icon={<XCircle className="w-3 h-3" style={{ color: '#6b7280' }} />}>False Positive</SelectItem>
                                    <SelectItem value="RETEST_PENDING" icon={<RotateCcw className="w-3 h-3" style={{ color: '#a855f7' }} />}>Retest Pending</SelectItem>
                                    <SelectItem value="RETEST_FAILED" icon={<XCircle className="w-3 h-3" style={{ color: '#ef4444' }} />}>Retest Failed</SelectItem>
                                </SelectContent>
                            </EnhancedSelect>
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
                                {!(vulnSearchQuery || vulnSeverityFilter !== 'ALL' || vulnStatusFilter !== 'ALL') && !isClient && (
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
                                                {!isClient && <TableHead className="text-right">Actions</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedVulnerabilities.map((vuln) => (
                                                <TableRow
                                                    key={vuln.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => router.push(`/project/${projectId}/vulnerabilities/${vuln.id}`)}
                                                >
                                                    <TableCell className="font-medium">{vuln.title}</TableCell>
                                                    <TableCell>
                                                        <SeverityBadge severity={vuln.severity} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge status={vuln.status} />
                                                    </TableCell>
                                                    <TableCell>{vuln.cvss_base_score ? Number(vuln.cvss_base_score).toFixed(1) : 'N/A'}</TableCell>
                                                    {!isClient && (
                                                        <TableCell className="text-right">
                                                            <div
                                                                className="flex justify-end gap-2"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
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
                                                    )}
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
                    </div>
                </TabsContent>

                <TabsContent value="assets" className="space-y-4">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold">Project Assets</h2>
                        <p className="text-sm text-muted-foreground">Manage assets associated with this project</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4 items-center">
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
                            {!isClient && (
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
                        )}
                            <EnhancedSelect value={assetStatusFilter} onValueChange={(value: string) => {
                                setAssetStatusFilter(value);
                                setAssetPage(1);
                            }} colorType="assetStatus">
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active" color="#22c55e">Active</SelectItem>
                                    <SelectItem value="inactive" color="#ef4444">Inactive</SelectItem>
                                </SelectContent>
                            </EnhancedSelect>
                            {!isClient && (
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAttachAllAssets}
                                    disabled={!canEdit}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Attach All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDetachAllAssets}
                                    disabled={!canEdit}
                                >
                                    <Minus className="mr-2 h-4 w-4" />
                                    Detach All
                                </Button>
                            </div>
                        )}
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
                                                <TableHead>Status</TableHead>
                                                {!isClient && <TableHead className="text-right">Actions</TableHead>}
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
                                                        <TableCell>
                                                            <AssetStatusBadge status={asset.is_active} />
                                                        </TableCell>
                                                        {!isClient && (
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
                                                        )}
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
                    </div>
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

            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Generate Report for {project.title}</DialogTitle>
                        <DialogDescription>
                            Select a template to generate a report for this project.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {reportError && (
                            <Alert variant="destructive">
                                <AlertDescription>{reportError}</AlertDescription>
                            </Alert>
                        )}

                        <div className="grid gap-2">
                            <Label>Report Template</Label>
                            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a template" />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map(t => {
                                        const isHtml = t.file?.toLowerCase().endsWith('.html');
                                        const isDocx = t.file?.toLowerCase().endsWith('.docx');
                                        const type = isHtml ? 'HTML' : isDocx ? 'DOCX' : 'Unknown';
                                        const badgeColor = isHtml ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';

                                        return (
                                            <SelectItem key={t.id} value={t.id}>
                                                <div className="flex items-center justify-between w-full gap-4">
                                                    <span>{t.name}</span>
                                                    <Badge variant="outline" className={`ml-2 text-xs py-0 h-5 ${badgeColor}`}>
                                                        {type}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReportDialogOpen(false)} disabled={generating}>
                            Cancel
                        </Button>
                        <Button onClick={handleGenerateReport} disabled={generating}>
                            {generating ? 'Generating...' : 'Generate Report'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
