'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EnhancedSelect } from '@/components/ui/select';
import { Pencil, Trash2, Plus, Search, Upload, AlertCircle, Clock, CheckCircle, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { SeverityBadge } from '@/components/vulnerabilities/severity-badge';
import { TablePagination } from '@/components/ui/table-pagination';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CSVImportDialog } from '@/components/ui/csv-import-dialog';

interface VulnerabilityTemplate {
    id: string;
    title: string;
    severity: string;
    created_at: string;
    updated_at: string;
}

export function TemplatesTable() {
    const router = useRouter();
    const { user } = useAuth();
    const [templates, setTemplates] = useState<VulnerabilityTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
    const [importDialogOpen, setImportDialogOpen] = useState(false);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page: page.toString(), page_size: '12' });
            if (search) params.append('search', search);
            if (selectedSeverity !== 'all') params.append('severity', selectedSeverity);

            const response = await api.get('/vulnerability-templates/', { params });

            const results = response.data.results || response.data;
            const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);

            setTemplates(results);
            setTotalCount(count);
        } catch (error) {
            console.error('Failed to fetch templates', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, [page, search, selectedSeverity]);

    const handleDelete = async () => {
        if (!templateToDelete) return;
        try {
            await api.delete(`/vulnerability-templates/${templateToDelete}/`);
            fetchTemplates(); // Refresh
            setTemplateToDelete(null);
        } catch (error) {
            console.error('Failed to delete template', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Vulnerability Templates</h2>
                    <p className="text-muted-foreground">
                        Manage reusable templates for vulnerability findings.
                    </p>
                </div>
                {(user?.role === 'ADMIN' || user?.role === 'TESTER') && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" />
                            Import CSV
                        </Button>
                        <Link href="/templates/create">
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Template
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <EnhancedSelect value={selectedSeverity} onValueChange={setSelectedSeverity} colorType="severity">
                    <SelectTrigger className="w-full md:w-[200px]">
                        <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="CRITICAL" color="#ef4444">Critical</SelectItem>
                        <SelectItem value="HIGH" color="#f97316">High</SelectItem>
                        <SelectItem value="MEDIUM" color="#eab308">Medium</SelectItem>
                        <SelectItem value="LOW" color="#3b82f6">Low</SelectItem>
                        <SelectItem value="INFO" color="#22c55e">Info</SelectItem>
                        <SelectItem value="UNCLASSIFIED" color="#6b7280">Unclassified</SelectItem>
                    </SelectContent>
                </EnhancedSelect>
            </div>

            <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Last Updated</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : templates.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No templates found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            templates.map((template) => (
                                <TableRow 
                                    key={template.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => router.push(`/templates/${template.id}`)}
                                >
                                    <TableCell className="font-medium">{template.title}</TableCell>
                                    <TableCell>
                                        <SeverityBadge severity={template.severity} />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {format(new Date(template.updated_at), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-end gap-2">
                                            {(user?.role === 'ADMIN' || user?.role === 'TESTER') && (
                                                <>
                                                    <Button variant="ghost" size="sm">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setTemplateToDelete(template.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
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

            <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the template.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <CSVImportDialog
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
                onSuccess={fetchTemplates}
                title="Import Vulnerability Templates"
                description="Upload a CSV file to bulk import vulnerability templates."
                templateEndpoint="/vulnerability-templates/csv-template/"
                importEndpoint="/vulnerability-templates/bulk-import/"
            />
        </div>
    );
}
