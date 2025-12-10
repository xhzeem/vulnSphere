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
import { ReportCreateDialog } from '@/components/reports/report-create-dialog';
import { ReportEditDialog } from '@/components/reports/report-edit-dialog';
import { ReportDeleteDialog } from '@/components/reports/report-delete-dialog';
import { AssetCreateDialog } from '@/components/assets/asset-create-dialog';
import { AssetEditDialog } from '@/components/assets/asset-edit-dialog';
import { AssetDeleteDialog } from '@/components/assets/asset-delete-dialog';
import { Plus, FileText, Server, Pencil, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

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

interface Report {
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
    const [reports, setReports] = useState<Report[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const [reportEditDialogOpen, setReportEditDialogOpen] = useState(false);
    const [reportDeleteDialogOpen, setReportDeleteDialogOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [reportPage, setReportPage] = useState(1);

    const [assetDialogOpen, setAssetDialogOpen] = useState(false);
    const [assetEditDialogOpen, setAssetEditDialogOpen] = useState(false);
    const [assetDeleteDialogOpen, setAssetDeleteDialogOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [assetPage, setAssetPage] = useState(1);

    // Tab state
    const [activeTab, setActiveTab] = useState('reports');

    const fetchCompanyData = async () => {
        try {
            setLoading(true);
            const [companyRes, reportsRes, assetsRes] = await Promise.all([
                api.get(`/companies/${companyId}/`),
                api.get(`/companies/${companyId}/reports/`),
                api.get(`/companies/${companyId}/assets/`),
            ]);

            setCompany(companyRes.data);
            setReports(reportsRes.data.results || reportsRes.data);
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

    const handleReportEdit = (report: Report) => {
        setSelectedReport(report);
        setReportEditDialogOpen(true);
    };

    const handleReportDelete = (report: Report) => {
        setSelectedReport(report);
        setReportDeleteDialogOpen(true);
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
    const reportStartIndex = (reportPage - 1) * ITEMS_PER_PAGE;
    const paginatedReports = reports.slice(reportStartIndex, reportStartIndex + ITEMS_PER_PAGE);

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
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                <p className="text-muted-foreground">{company.contact_email}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {company.address && (
                        <div>
                            <span className="text-sm font-medium">Address:</span>
                            <p className="text-sm text-muted-foreground">{company.address}</p>
                        </div>
                    )}
                    {company.notes && (
                        <div>
                            <span className="text-sm font-medium">Notes:</span>
                            <p className="text-sm text-muted-foreground">{company.notes}</p>
                        </div>
                    )}
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
                    <TabsTrigger value="reports">Reports ({reports.length})</TabsTrigger>
                    <TabsTrigger value="assets">Assets ({assets.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="reports" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Reports</h2>
                        <Button onClick={() => setReportDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New Report
                        </Button>
                    </div>

                    {reports.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                                <p className="text-muted-foreground mb-4">Create your first report to get started</p>
                                <Button onClick={() => setReportDialogOpen(true)}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    New Report
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
                                        {paginatedReports.map((report) => (
                                            <TableRow key={report.id}>
                                                <TableCell className="font-medium">{report.title}</TableCell>
                                                <TableCell>{report.engagement_type}</TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusColor(report.status)}>
                                                        {report.status.replace('_', ' ')}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(report.start_date).toLocaleDateString()} - {new Date(report.end_date).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <Link href={`/reports/${report.id}`}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleReportEdit(report)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleReportDelete(report)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    currentPage={reportPage}
                                    totalItems={reports.length}
                                    itemsPerPage={ITEMS_PER_PAGE}
                                    onPageChange={setReportPage}
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

            <ReportCreateDialog
                companyId={companyId}
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <ReportEditDialog
                report={selectedReport}
                open={reportEditDialogOpen}
                onOpenChange={setReportEditDialogOpen}
                onSuccess={fetchCompanyData}
            />

            <ReportDeleteDialog
                report={selectedReport}
                open={reportDeleteDialogOpen}
                onOpenChange={setReportDeleteDialogOpen}
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
