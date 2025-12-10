'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface Report {
    id: string;
    company: string;
    title: string;
    engagement_type: string;
    start_date: string;
    end_date: string;
    summary: string;
}

interface ReportEditDialogProps {
    report: Report | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ReportEditDialog({ report, open, onOpenChange, onSuccess }: ReportEditDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        engagement_type: '',
        start_date: '',
        end_date: '',
        summary: '',
    });

    useEffect(() => {
        if (report) {
            setFormData({
                title: report.title,
                engagement_type: report.engagement_type,
                start_date: report.start_date,
                end_date: report.end_date,
                summary: report.summary || '',
            });
        }
    }, [report]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!report) return;

        setLoading(true);
        setError('');

        try {
            await api.patch(`/companies/${report.company}/reports/${report.id}/`, formData);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.title?.[0] ||
                'Failed to update report';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Report</DialogTitle>
                        <DialogDescription>Update report information</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="edit-title">Report Title *</Label>
                            <Input
                                id="edit-title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-engagement-type">Engagement Type *</Label>
                            <Input
                                id="edit-engagement-type"
                                required
                                value={formData.engagement_type}
                                onChange={(e) => setFormData({ ...formData, engagement_type: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-start-date">Start Date *</Label>
                                <Input
                                    id="edit-start-date"
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-end-date">End Date *</Label>
                                <Input
                                    id="edit-end-date"
                                    type="date"
                                    required
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Report'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
