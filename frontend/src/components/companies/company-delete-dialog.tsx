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
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

interface Company {
    id: string;
    name: string;
    contact_email: string;
}

interface CompanyDeleteDialogProps {
    company: Company | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function CompanyDeleteDialog({ company, open, onOpenChange, onSuccess }: CompanyDeleteDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!company) return;

        setLoading(true);
        setError('');

        try {
            await api.delete(`/companies/${company.id}/`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Failed to delete company';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!company) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Company
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the company and all associated reports, assets, and vulnerabilities.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="rounded-lg border p-4 space-y-2">
                        <div>
                            <span className="text-sm font-medium">Company:</span>
                            <span className="ml-2 text-sm">{company.name}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium">Email:</span>
                            <span className="ml-2 text-sm">{company.contact_email}</span>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? 'Deleting...' : 'Delete Company'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
