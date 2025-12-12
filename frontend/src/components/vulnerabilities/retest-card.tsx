'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, Save, X, Pencil, History, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SimpleEditor, SimpleEditorMethods } from '@/components/tiptap-templates/simple/simple-editor';
import { SimpleRenderer } from '@/components/tiptap-templates/simple/simple-renderer';
import { useAuth } from '@/hooks/use-auth';
import { getTemplate } from '@/lib/tiptap-templates';

interface Retest {
    id: string;
    retest_date: string;
    performed_by_name: string;
    requested_by_name: string;
    request_type: 'INITIAL' | 'REQUEST' | 'RETEST';
    status: 'PASSED' | 'FAILED' | 'PARTIAL' | null;
    notes_md: string;
    created_at: string;
}

interface RetestCardProps {
    companyId: string;
    projectId: string;
    vulnerabilityId: string;
    editingRetestId?: string;
    onRetestUpdated?: () => void;
    onImageUploaded?: () => void; // Callback for when images are uploaded
}

export function RetestCard({ companyId, projectId, vulnerabilityId, editingRetestId, onRetestUpdated, onImageUploaded }: RetestCardProps) {
    const { canEdit } = useAuth();
    const [retests, setRetests] = useState<Retest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingRetest, setEditingRetest] = useState<Retest | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState<'PASSED' | 'FAILED' | 'PARTIAL' | null>(null);
    const [requestType, setRequestType] = useState<'INITIAL' | 'REQUEST' | 'RETEST'>('RETEST');
    const editorRef = useRef<SimpleEditorMethods>(null);

    const handleInsertAttachment = (attachment: any) => {
        if (editorRef.current) {
            // Check if the attachment is an image
            const isImage = attachment.file_name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
            
            if (isImage) {
                // Insert as actual image using TipTap's image node
                const imageHtml = `<img src="${attachment.file}" alt="${attachment.file_name}" />`;
                editorRef.current.insertContent(imageHtml);
            } else {
                // Insert as markdown link for non-image files
                const linkText = `[${attachment.file_name}](${attachment.file})`;
                editorRef.current.insertContent(linkText);
            }
            editorRef.current.focus();
        }
    };

    const fetchRetests = async () => {
        try {
            const response = await api.get(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/retests/`);
            setRetests(response.data.results || response.data);
        } catch (error) {
            console.error('Failed to fetch retests', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyId && projectId && vulnerabilityId) {
            fetchRetests();
        }
    }, [companyId, projectId, vulnerabilityId]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = {
                status: status,
                notes_md: notes,
            };

            if (editingRetest) {
                // Update existing
                await api.patch(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/retests/${editingRetest.id}/`, payload);
            } else {
                // Create new
                await api.post(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/retests/`, payload);
            }

            setNotes('');
            setStatus('PASSED');
            setEditingRetest(null);
            setIsAddingNew(false);

            fetchRetests();
        } catch (error) {
            console.error('Failed to save retest', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (retest: Retest) => {
        setEditingRetest(retest);
        setStatus(retest.status || 'PASSED');
        setNotes(retest.notes_md || '');
        setIsAddingNew(true);
    };

    const handleCancel = () => {
        setIsAddingNew(false);
        setEditingRetest(null);
        setNotes('');
        setStatus('PASSED');
    };

    const handleAddNew = () => {
        setEditingRetest(null);
        setNotes(getTemplate('NEW_RETEST'));
        setStatus('PASSED');
        setIsAddingNew(true);
    };

    const handleDelete = async (retest: Retest) => {
        if (!confirm('Are you sure you want to delete this retest entry?')) return;

        try {
            await api.delete(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/retests/${retest.id}/`);
            fetchRetests();
        } catch (error) {
            console.error('Failed to delete retest', error);
        }
    };

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'PASSED':
                return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Passed</Badge>;
            case 'FAILED':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
            case 'PARTIAL':
                return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" /> Partial</Badge>;
            default:
                return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'INITIAL': return 'Initial Finding';
            case 'REQUEST': return 'Retest Requested';
            case 'RETEST': return 'Retest Performed';
            default: return type;
        }
    };

    const getTimelineColor = (retest: Retest) => {
        // For REQUEST type, use purple
        if (retest.request_type === 'REQUEST') {
            return 'bg-purple-500';
        }

        // For RETEST, base on status
        if (retest.request_type === 'RETEST') {
            switch (retest.status) {
                case 'PASSED': return 'bg-green-500';
                case 'FAILED': return 'bg-red-500';
                case 'PARTIAL': return 'bg-yellow-500';
                default: return 'bg-gray-500';
            }
        }

        // INITIAL or other
        return 'bg-blue-500';
    };

    const getTimelineIcon = (retest: Retest) => {
        if (retest.request_type === 'REQUEST') {
            return <Clock className="h-4 w-4 text-white" />;
        }

        if (retest.request_type === 'RETEST') {
            switch (retest.status) {
                case 'PASSED': return <CheckCircle2 className="h-4 w-4 text-white" />;
                case 'FAILED': return <XCircle className="h-4 w-4 text-white" />;
                case 'PARTIAL': return <AlertCircle className="h-4 w-4 text-white" />;
                default: return <Clock className="h-4 w-4 text-white" />;
            }
        }

        return <History className="h-4 w-4 text-white" />;
    };

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading retest history...</div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <CardTitle className="text-base font-medium">Retest History ({retests.length})</CardTitle>
                </div>
                {!isAddingNew && canEdit && (
                    <Button size="sm" onClick={handleAddNew}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add New Entry Form */}
                {isAddingNew && (
                    <div className="border-2 border-dashed rounded-lg p-4 space-y-4 bg-muted/20">
                        <h3 className="font-semibold">{editingRetest ? 'Edit Entry' : 'New Entry'}</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Outcome</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        type="button"
                                        variant={status === 'PASSED' ? 'default' : 'outline'}
                                        className={`flex items-center gap-2 h-12 ${
                                            status === 'PASSED' 
                                                ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                                                : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300 dark:hover:bg-green-950 dark:hover:text-green-400'
                                        }`}
                                        onClick={() => setStatus('PASSED')}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        <span>Passed</span>
                                        <span className="text-xs opacity-75">(Fixed)</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={status === 'FAILED' ? 'destructive' : 'outline'}
                                        className={`flex items-center gap-2 h-12 ${
                                            status === 'FAILED' 
                                                ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                                                : 'hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-950 dark:hover:text-red-400'
                                        }`}
                                        onClick={() => setStatus('FAILED')}
                                    >
                                        <XCircle className="h-4 w-4" />
                                        <span>Failed</span>
                                        <span className="text-xs opacity-75">(Still Vulnerable)</span>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={status === 'PARTIAL' ? 'default' : 'outline'}
                                        className={`flex items-center gap-2 h-12 ${
                                            status === 'PARTIAL' 
                                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600' 
                                                : 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300 dark:hover:bg-amber-950 dark:hover:text-amber-400'
                                        }`}
                                        onClick={() => setStatus('PARTIAL')}
                                    >
                                        <AlertCircle className="h-4 w-4" />
                                        <span>Partial</span>
                                        <span className="text-xs opacity-75">(Partial Fix)</span>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <SimpleEditor
                                ref={editorRef}
                                content={notes}
                                onChange={setNotes}
                                placeholder="Describe validation steps and results..."
                                companyId={companyId}
                                projectId={projectId}
                                vulnerabilityId={vulnerabilityId}
                                onImageUploaded={onImageUploaded}
                                context="vulnerability"
                                height={200}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCancel}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSubmit} disabled={submitting || !notes}>
                                <Save className="h-4 w-4 mr-2" />
                                {submitting ? 'Saving...' : (editingRetest ? 'Update' : 'Save Entry')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Timeline Thread */}
                {retests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No retest history available.</p>
                    </div>
                ) : (
                    <div className="relative space-y-4">
                        {/* Gray Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-500/30" />

                        {retests.map((retest, index) => (
                            <div key={retest.id} className="relative flex gap-4">
                                {/* Timeline dot - color based on status */}
                                <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full ${getTimelineColor(retest)} flex items-center justify-center ring-4 ring-background`}>
                                    {getTimelineIcon(retest)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm">{getTypeLabel(retest.request_type)}</span>
                                                {retest.request_type === 'RETEST' && getStatusBadge(retest.status)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                <span className="font-medium">
                                                    {retest.request_type === 'REQUEST' ? retest.requested_by_name : retest.performed_by_name || 'Unknown'}
                                                </span>
                                                {' · '}
                                                {formatDistanceToNow(new Date(retest.created_at), { addSuffix: true })}
                                            </div>
                                        </div>
                                        {canEdit && (
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => handleEdit(retest)}
                                                >
                                                    <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                                    onClick={() => handleDelete(retest)}
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    {retest.notes_md && (
                                        <div className="mt-2 p-4 bg-muted/30 rounded-lg border">
                                            <SimpleRenderer content={retest.notes_md} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
