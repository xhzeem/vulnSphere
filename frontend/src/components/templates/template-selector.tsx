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
import { ScrollArea } from '@/components/ui/scroll-area';

interface VulnerabilityTemplate {
    id: string;
    title: string;
    severity: string;
    cvss_base_score?: number;
    cvss_vector?: string;
    details_html?: string;
    references?: string[];
}

interface TemplateSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (template: VulnerabilityTemplate) => void;
}

export function TemplateSelector({ open, onOpenChange, onSelect }: TemplateSelectorProps) {
    const [templates, setTemplates] = useState<VulnerabilityTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open) {
            const fetchTemplates = async () => {
                setLoading(true);
                try {
                    const response = await api.get('/vulnerability-templates/', {
                        params: { search }
                    });
                    setTemplates(response.data.results || response.data);
                } catch (error) {
                    console.error('Failed to fetch templates', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchTemplates();
        }
    }, [open, search]);

    const handleSelect = async (templateId: string) => {
        try {
            // Fetch full details
            const response = await api.get(`/vulnerability-templates/${templateId}/`);
            onSelect(response.data);
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to fetch template details', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Select Template</DialogTitle>
                    <DialogDescription>
                        Choose a template to pre-fill vulnerability details.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <ScrollArea className="h-[300px]">
                        {loading ? (
                            <div className="text-center py-4 text-muted-foreground">Loading...</div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">No templates found.</div>
                        ) : (
                            <div className="grid gap-2">
                                {templates.map((template) => (
                                    <Button
                                        key={template.id}
                                        variant="outline"
                                        className="justify-between h-auto py-3 px-4"
                                        onClick={() => handleSelect(template.id)}
                                    >
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="font-medium">{template.title}</span>
                                        </div>
                                        <SeverityBadge severity={template.severity} />
                                    </Button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
