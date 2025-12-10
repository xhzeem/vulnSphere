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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import api from '@/lib/api';

interface Asset {
    id: string;
    company: string;
    name: string;
    type: string;
    identifier: string;
    environment: string;
    description: string;
}

interface AssetEditDialogProps {
    asset: Asset | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AssetEditDialog({ asset, open, onOpenChange, onSuccess }: AssetEditDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        name: '',
        type: 'WEB_APP',
        identifier: '',
        environment: 'PRODUCTION',
        description: '',
    });

    useEffect(() => {
        if (asset) {
            setFormData({
                name: asset.name,
                type: asset.type,
                identifier: asset.identifier,
                environment: asset.environment,
                description: asset.description || '',
            });
        }
    }, [asset]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!asset) return;

        setLoading(true);
        setError('');

        try {
            await api.patch(`/companies/${asset.company}/assets/${asset.id}/`, formData);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.name?.[0] ||
                'Failed to update asset';
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
                        <DialogTitle>Edit Asset</DialogTitle>
                        <DialogDescription>Update asset information</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name">Asset Name *</Label>
                            <Input
                                id="edit-name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-type">Type *</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WEB_APP">Web Application</SelectItem>
                                        <SelectItem value="API">API</SelectItem>
                                        <SelectItem value="SERVER">Server</SelectItem>
                                        <SelectItem value="MOBILE_APP">Mobile Application</SelectItem>
                                        <SelectItem value="NETWORK_DEVICE">Network Device</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-environment">Environment *</Label>
                                <Select
                                    value={formData.environment}
                                    onValueChange={(value) => setFormData({ ...formData, environment: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRODUCTION">Production</SelectItem>
                                        <SelectItem value="STAGING">Staging</SelectItem>
                                        <SelectItem value="DEVELOPMENT">Development</SelectItem>
                                        <SelectItem value="TEST">Test</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-identifier">Identifier *</Label>
                            <Input
                                id="edit-identifier"
                                required
                                value={formData.identifier}
                                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Asset'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
