'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, Save, X, Pencil, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MDXEditorComponent } from '@/components/mdx-editor';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/hooks/use-auth';

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
}

export function RetestCard({ companyId, projectId, vulnerabilityId }: RetestCardProps) {
    const { canEdit } = useAuth();
    const [retests, setRetests] = useState<Retest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingRetestId, setEditingRetestId] = useState<string | null>(null);

    // Form state
    const [requestType, setRequestType] = useState<'INITIAL' | 'REQUEST' | 'RETEST'>('RETEST');
    const [status, setStatus] = useState<'PASSED' | 'FAILED' | 'PARTIAL' | null>('PASSED');
    const [notes, setNotes] = useState('');

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
                request_type: requestType,
                status: requestType === 'RETEST' ? status : null,
                notes_md: notes
            };

            if (editingRetestId) {
                // Update existing
                await api.patch(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/retests/${editingRetestId}/`, payload);
            } else {
                // Create new
                await api.post(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/retests/`, payload);
            }

            setNotes('');
            setRequestType('RETEST');
            setStatus('PASSED');
            setEditingRetestId(null);
            setIsAdding(false);

            fetchRetests();
        } catch (error) {
            console.error('Failed to save retest', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (retest: Retest) => {
        setEditingRetestId(retest.id);
        setRequestType(retest.request_type);
        setStatus(retest.status || 'PASSED');
        setNotes(retest.notes_md || '');
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingRetestId(null);
        setNotes('');
        setRequestType('RETEST');
        setStatus('PASSED');
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
                    <History className="h-5 w-5" />
                    <CardTitle>Retest History</CardTitle>
                    <Badge variant="outline">{retests.length}</Badge>
                </div>
                {!isAdding && canEdit && (
                    <Button size="sm" onClick={() => setIsAdding(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Add New Entry Form */}
                {isAdding && (
                    <div className="border-2 border-dashed rounded-lg p-4 space-y-4 bg-muted/20">
                        <h3 className="font-semibold">{editingRetestId ? 'Edit Entry' : 'New Entry'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Entry Type</Label>
                                <Select
                                    value={requestType}
                                    onValueChange={(v: 'INITIAL' | 'REQUEST' | 'RETEST') => setRequestType(v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RETEST">Record Retest Result</SelectItem>
                                        <SelectItem value="REQUEST">Request Retest</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {requestType === 'RETEST' && (
                                <div className="space-y-2">
                                    <Label>Outcome</Label>
                                    <Select
                                        value={status || ''}
                                        onValueChange={(v: any) => setStatus(v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PASSED">Passed (Fixed)</SelectItem>
                                            <SelectItem value="FAILED">Failed (Still Vulnerable)</SelectItem>
                                            <SelectItem value="PARTIAL">Partial Fix</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Markdown)</Label>
                            <MDXEditorComponent
                                value={notes}
                                onChange={setNotes}
                                placeholder={requestType === 'RETEST' ? "Describe validation steps..." : "Describe request..."}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCancel}>
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleSubmit} disabled={submitting || !notes}>
                                <Save className="h-4 w-4 mr-2" />
                                {submitting ? 'Saving...' : (editingRetestId ? 'Update' : 'Save Entry')}
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
                        {/* Purple Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-purple-500/30" />

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
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleEdit(retest)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>

                                    {retest.notes_md && (
                                        <div className="prose prose-sm dark:prose-invert max-w-none mt-2 p-4 bg-muted/30 rounded-lg border">
                                            <ReactMarkdown
                                                components={{
                                                    img: ({ node, ...props }) => <img {...props} src={props.src || undefined} alt={props.alt || ''} />
                                                }}
                                            >
                                                {retest.notes_md}
                                            </ReactMarkdown>
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
