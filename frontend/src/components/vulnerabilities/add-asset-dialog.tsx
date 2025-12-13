'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Asset {
    id: string;
    name: string;
    identifier?: string;
}

interface AddAssetDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAddAsset: (assetId: string) => void;
    assets: Asset[];
}

export function AddAssetDialog({ isOpen, onClose, onAddAsset, assets }: AddAssetDialogProps) {
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    const handleAdd = () => {
        if (selectedAssetId) {
            onAddAsset(selectedAssetId);
            setSelectedAssetId(null);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Asset to Vulnerability</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Select onValueChange={setSelectedAssetId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an asset" />
                        </SelectTrigger>
                        <SelectContent>
                            {assets.map(asset => (
                                <SelectItem key={asset.id} value={asset.id}>
                                    {asset.name} {asset.identifier && `(${asset.identifier})`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleAdd} disabled={!selectedAssetId}>Add Asset</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
