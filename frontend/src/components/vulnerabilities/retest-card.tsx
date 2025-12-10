'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, RefreshCw, CheckCircle2, XCircle, AlertCircle, Clock, Save, X, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { MDXEditorComponent } from '@/components/mdx-editor';
import ReactMarkdown from 'react-markdown';

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

            // Clear fields specifically requested by user ("also when saving clear the fields")
            // And reset state
            setNotes('');
            setEditingRetestId(null);

            // Should we keep adding? User said "can keep adding multiple".
            // If we just EDITED, we probably want to close the form.
            // If we ADDED, we might want to keep it open or close it. 
            // The user's request "retest could be edited, also when saving clear the fields" 
            // implies clearing is important. 
            // Let's keep it simple: If editing, close form. If adding, clear fields but keep form open OR close form?
            // "button to add a new retest etc.. and can keep adding multiple" suggests sticking to addition workflow.
            // But usually "clear fields" implies getting ready for the NEXT one.
            // So for Add mode: Clear fields, stay open (or close? let's stick to previous: clear fields, stay open).
            // For Edit mode: Close form.

            if (editingRetestId) {
                setIsAdding(false);
            } else {
                // Reset defaults for next add
                setRequestType('RETEST');
                setStatus('PASSED');
            }
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

    if (loading) {
        return <div className="text-sm text-muted-foreground">Loading retest history...</div>;
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle>Retest History</CardTitle>
                    <CardDescription>Track validation attempts and status changes</CardDescription>
                </div>
                {!isAdding && (
                    <Button size="sm" onClick={() => {
                        handleCancel(); // Clear any previous edit state
                        setIsAdding(true);
                    }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Retest
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                {isAdding && (
                    <Card className="border-dashed">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">{editingRetestId ? 'Edit Retest' : 'New Retest Entry'}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Entry Type</Label>
                                    <Select
                                        value={requestType}
                                        onValueChange={(v: 'INITIAL' | 'REQUEST' | 'RETEST') => setRequestType(v)}
                                        disabled={requestType === 'INITIAL'} // distinct initial findings usually shouldn't change type manualy
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RETEST">Record Retest Result</SelectItem>
                                            <SelectItem value="REQUEST">Request Retest</SelectItem>
                                            {requestType === 'INITIAL' && <SelectItem value="INITIAL">Initial Finding</SelectItem>}
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
                                    {submitting ? 'Saving...' : (editingRetestId ? 'Update Entry' : 'Save & Add Another')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {retests.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                        <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No retest history available.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {retests.map((retest) => (
                            <div key={retest.id} className="flex flex-col space-y-2 border rounded-lg p-4 bg-card/50">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm">{getTypeLabel(retest.request_type)}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(retest.created_at), 'MMM d, yyyy HH:mm')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {retest.request_type === 'RETEST' && getStatusBadge(retest.status)}
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(retest)}>
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="text-sm">
                                    <span className="text-muted-foreground">By: </span>
                                    {retest.request_type === 'REQUEST' ? retest.requested_by_name : retest.performed_by_name || 'Unknown'}
                                </div>

                                {retest.notes_md && (
                                    <div className="text-sm mt-2 p-3 bg-muted/30 rounded border prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{retest.notes_md}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
