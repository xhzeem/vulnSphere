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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ReportCreateDialogProps {
    companyId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ReportCreateDialog({ companyId, open, onOpenChange, onSuccess }: ReportCreateDialogProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    const [formData, setFormData] = useState({
        title: '',
        engagement_type: 'Web Application Penetration Test',
        start_date: today,
        end_date: today,
        summary: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await api.post(`/companies/${companyId}/reports/`, formData);
            const createdReport = response.data;

            if (onSuccess) {
                onSuccess();
            }

            onOpenChange(false);

            // Navigate to the report detail page
            router.push(`/reports/${createdReport.id}`);

            // Reset form
            setFormData({
                title: '',
                engagement_type: 'Web Application Penetration Test',
                start_date: today,
                end_date: today,
                summary: '',
            });
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.title?.[0] ||
                'Failed to create report';
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
                        <DialogTitle>New Report</DialogTitle>
                        <DialogDescription>
                            Create a new vulnerability assessment report
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Report Title *</Label>
                            <Input
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Q4 2024 Penetration Test"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="engagement_type">Engagement Type *</Label>
                            <Input
                                id="engagement_type"
                                required
                                value={formData.engagement_type}
                                onChange={(e) => setFormData({ ...formData, engagement_type: e.target.value })}
                                placeholder="e.g., Black Box Penetration Test"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start_date">Start Date *</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    required
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end_date">End Date *</Label>
                                <Input
                                    id="end_date"
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
                            {loading ? 'Creating...' : 'Create Report'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
