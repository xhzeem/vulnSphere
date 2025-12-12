'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Search } from 'lucide-react';
import { SeverityBadge } from '@/components/vulnerabilities/severity-badge';
import { TablePagination } from '@/components/ui/table-pagination';

interface VulnerabilityTemplate {
    id: string;
    title: string;
    severity: string;
}

interface TemplateSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTemplateSelect: (templateId: string) => void;
}

export function TemplateSelectionDialog({ open, onOpenChange, onTemplateSelect }: TemplateSelectionDialogProps) {
    const [templates, setTemplates] = useState<VulnerabilityTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ 
                page: page.toString(), 
                page_size: '10' 
            });
            if (search) params.append('search', search);

            const response = await api.get('/vulnerability-templates/', { params });
            
            const results = response.data.results || response.data;
            const count = response.data.count || (Array.isArray(response.data) ? response.data.length : 0);

            setTemplates(results);
            setTotalCount(count);
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) {
            fetchTemplates();
        }
    }, [open, page, search]);

    useEffect(() => {
        setPage(1); // Reset page when search changes
    }, [search]);

    const handleTemplateClick = (templateId: string) => {
        onTemplateSelect(templateId);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-5xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="text-sm">Load Template</DialogTitle>
                    <DialogDescription className="text-xs">
                        Select a template to override current vulnerability content.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Search Box */}
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-7 text-sm h-8"
                        />
                    </div>

                    {/* Templates Table */}
                    <div className="border rounded-lg">
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <p>Loading templates...</p>
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                <p>No templates found.</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => handleTemplateClick(template.id)}
                                    >
                                        <span className="font-medium text-sm">{template.title}</span>
                                        <SeverityBadge severity={template.severity} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalCount > 10 && (
                        <TablePagination
                            currentPage={page}
                            totalItems={totalCount}
                            itemsPerPage={10}
                            onPageChange={setPage}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
