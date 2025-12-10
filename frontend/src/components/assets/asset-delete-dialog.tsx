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

interface Asset {
    id: string;
    company: string;
    name: string;
    type: string;
    identifier: string;
}

interface AssetDeleteDialogProps {
    asset: Asset | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AssetDeleteDialog({ asset, open, onOpenChange, onSuccess }: AssetDeleteDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!asset) return;

        setLoading(true);
        setError('');

        try {
            await api.delete(`/companies/${asset.company}/assets/${asset.id}/`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Failed to delete asset';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!asset) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete Asset
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the asset.
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
                            <span className="text-sm font-medium">Name:</span>
                            <span className="ml-2 text-sm">{asset.name}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium">Identifier:</span>
                            <span className="ml-2 text-sm">{asset.identifier}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium">Type:</span>
                            <span className="ml-2 text-sm">{asset.type}</span>
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
                        {loading ? 'Deleting...' : 'Delete Asset'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
