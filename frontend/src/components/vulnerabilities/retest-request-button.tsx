'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RotateCcw } from 'lucide-react';
import api from '@/lib/api';

interface RetestRequestButtonProps {
    companyId: string;
    projectId: string;
    vulnerabilityId: string;
    onSuccess?: () => void;
}

export function RetestRequestButton({
    companyId,
    projectId,
    vulnerabilityId,
    onSuccess
}: RetestRequestButtonProps) {
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await api.post(
                `/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/retests/request/`,
                {
                    notes_md: notes,
                }
            );

            setOpen(false);
            setNotes('');
            onSuccess?.();
        } catch (err: any) {
            console.error('Failed to request retest:', err);
            setError(err.response?.data?.detail || 'Failed to request retest');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button onClick={() => setOpen(true)} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Request Retest
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Request Retest</DialogTitle>
                            <DialogDescription>
                                Request a retest for this vulnerability. You can optionally add notes about why a retest is needed.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="grid gap-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes about why this retest is needed..."
                                    rows={4}
                                    disabled={loading}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Describe any changes made or reasons for requesting the retest
                                </p>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? 'Requesting...' : 'Request Retest'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
