'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Plus, X, Calculator } from 'lucide-react';
import { MDXEditorComponent } from '@/components/md-editor';
import { SeverityBadge } from '@/components/vulnerabilities/severity-badge';
import { CVSSCalculator } from '@/components/vulnerabilities/cvss-calculator';

interface TemplateFormData {
    title: string;
    severity: string;
    cvss_base_score: string;
    cvss_vector: string;
    details_md: string;
    references: string[];
}

interface TemplateFormProps {
    templateId?: string;
    mode: 'create' | 'edit';
}

export function TemplateForm({ templateId, mode }: TemplateFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(mode === 'edit');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [newReference, setNewReference] = useState('');
    const [cvssDialogOpen, setCvssDialogOpen] = useState(false);

    const [formData, setFormData] = useState<TemplateFormData>({
        title: '',
        severity: 'MEDIUM',
        cvss_base_score: '',
        cvss_vector: '',
        details_md: `### Description

### Impact

### Likelihood

### Proof of Concept

### Steps to Reproduce
1. 
2. 

### Remediation
`,
        references: [],
    });

    useEffect(() => {
        if (mode === 'edit' && templateId) {
            const fetchData = async () => {
                try {
                    const response = await api.get(`/vulnerability-templates/${templateId}/`);
                    setFormData({
                        title: response.data.title || '',
                        severity: response.data.severity || 'MEDIUM',
                        cvss_base_score: response.data.cvss_base_score?.toString() || '',
                        cvss_vector: response.data.cvss_vector || '',
                        details_md: response.data.details_md || '',
                        references: response.data.references || [],
                    });
                } catch (err) {
                    console.error('Failed to load template', err);
                    setError('Failed to load template data');
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [templateId, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const payload = {
                ...formData,
                cvss_base_score: formData.cvss_base_score ? parseFloat(formData.cvss_base_score) : null,
            };

            if (mode === 'create') {
                await api.post('/vulnerability-templates/', payload);
            } else {
                await api.patch(`/vulnerability-templates/${templateId}/`, payload);
            }

            router.push('/templates');
            router.refresh();
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.title?.[0] ||
                `Failed to ${mode} template`;
            setError(errorMessage);
            setSaving(false);
        }
    };

    const handleAddReference = () => {
        if (!newReference.trim()) return;
        const lines = newReference.split('\n').map(line => line.trim()).filter(line => line);
        setFormData({ ...formData, references: [...formData.references, ...lines] });
        setNewReference('');
    };

    const handleRemoveReference = (index: number) => {
        const updatedRefs = formData.references.filter((_, i) => i !== index);
        setFormData({ ...formData, references: updatedRefs });
    };

    const handleCVSSCalculate = (score: number, vector: string, severity: string) => {
        setFormData({
            ...formData,
            cvss_base_score: score.toString(),
            cvss_vector: vector,
            severity: severity,
        });
    };

    const handleUpload = async (file: File) => {
        // Since templates are global, where do we attach images?
        // We probably need a generic attachments endpoint or use base64 (not recommended for large images).
        // Or create an attachment linked to nothing initially?
        // For now, let's skip image upload implementation for templates unless specifically requested or if we reuse existing logic.
        // Existing attachment logic requires project/vuln ID.
        // Let's implement a 'template' attachment type or just allow creating unattached attachments temporarily?
        // Actually, we can reuse the generic 'media' upload if available, or just not support drag/drop images for now in templates.

        // Wait, the user wants us to "create a new vuln templates module".
        // The instructions didn't specify image support for templates, but good UX.
        // Let's just return empty string and log warning for now to keep it simple as I can't easily change backend for generic attachments right now.
        console.warn("Image upload not yet supported in templates");
        return "";
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {mode === 'create' ? 'Create Template' : 'Edit Template'}
                        </h1>
                        <p className="text-muted-foreground">
                            {mode === 'create' ? 'Create a new vulnerability template' : 'Update existing template'}
                        </p>
                    </div>
                </div>
                <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Template'}
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Template Details</CardTitle>
                    <CardDescription>Basic information for the vulnerability template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., SQL Injection Generic"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="severity">Severity *</Label>
                            <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                                <SelectTrigger className="[&>span:first-child]:w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CRITICAL" className="[&>span:not(.absolute)]:w-full"><SeverityBadge severity="CRITICAL" grow /></SelectItem>
                                    <SelectItem value="HIGH" className="[&>span:not(.absolute)]:w-full"><SeverityBadge severity="HIGH" grow /></SelectItem>
                                    <SelectItem value="MEDIUM" className="[&>span:not(.absolute)]:w-full"><SeverityBadge severity="MEDIUM" grow /></SelectItem>
                                    <SelectItem value="LOW" className="[&>span:not(.absolute)]:w-full"><SeverityBadge severity="LOW" grow /></SelectItem>
                                    <SelectItem value="INFO" className="[&>span:not(.absolute)]:w-full"><SeverityBadge severity="INFO" grow /></SelectItem>
                                    <SelectItem value="UNCLASSIFIED" className="[&>span:not(.absolute)]:w-full"><SeverityBadge severity="UNCLASSIFIED" grow /></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cvss">CVSS Base Score</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="cvss"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={formData.cvss_base_score}
                                    onChange={(e) => setFormData({ ...formData, cvss_base_score: e.target.value })}
                                    placeholder="0.0 - 10.0"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCvssDialogOpen(true)}
                                    title="CVSS Calculator"
                                >
                                    <Calculator className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="cvss_vector">CVSS Vector</Label>
                            <Input
                                id="cvss_vector"
                                value={formData.cvss_vector}
                                onChange={(e) => setFormData({ ...formData, cvss_vector: e.target.value })}
                                placeholder="CVSS Vector string"
                                readOnly
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Description & Details</CardTitle>
                    <CardDescription>The content that will be pre-filled in the vulnerability details</CardDescription>
                </CardHeader>
                <CardContent>
                    <MDXEditorComponent
                        value={formData.details_md}
                        onChange={(value) => setFormData({ ...formData, details_md: value })}
                        placeholder="Use markdown with sections..."
                        onUpload={handleUpload}
                        projectId={undefined}
                        companyId={undefined}
                        context="template"
                        height={600}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>References</CardTitle>
                    <CardDescription>Default references to include</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Textarea
                            value={newReference}
                            onChange={(e) => setNewReference(e.target.value)}
                            placeholder="Enter reference URL..."
                            rows={3}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    handleAddReference();
                                }
                            }}
                        />
                        <Button type="button" onClick={handleAddReference}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    {formData.references.length > 0 && (
                        <div className="space-y-2">
                            {formData.references.map((ref, index) => (
                                <div key={index} className="flex items-center gap-2 px-2 border rounded">
                                    <span className="flex-1 text-sm break-all">{ref}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRemoveReference(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <CVSSCalculator
                open={cvssDialogOpen}
                onOpenChange={setCvssDialogOpen}
                onCalculate={handleCVSSCalculate}
                initialVector={formData.cvss_vector}
            />
        </form>
    );
}
