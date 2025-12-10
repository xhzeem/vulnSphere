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
import { User } from '@/lib/auth-utils';
import api from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

interface UserDeleteDialogProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function UserDeleteDialog({ user, open, onOpenChange, onSuccess }: UserDeleteDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleDelete = async () => {
        if (!user) return;

        setLoading(true);
        setError('');

        try {
            await api.delete(`/users/${user.id}/`);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || 'Failed to delete user';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Delete User
                    </DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the user account.
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
                            <span className="ml-2 text-sm">{user.first_name} {user.last_name}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium">Email:</span>
                            <span className="ml-2 text-sm">{user.email}</span>
                        </div>
                        <div>
                            <span className="text-sm font-medium">Role:</span>
                            <span className="ml-2 text-sm">
                                {user.global_role === 'ADMIN' ? 'Global Admin' : 'Standard User'}
                            </span>
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
                        {loading ? 'Deleting...' : 'Delete User'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
