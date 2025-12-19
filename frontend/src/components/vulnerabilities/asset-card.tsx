'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Package, MoreHorizontal, Server, Network, Globe, Smartphone, HardDrive } from 'lucide-react';
import { AddAssetDialog } from './add-asset-dialog';
import { Asset } from '@/lib/types';

interface AssetCardProps {
    companyId: string;
    projectId: string;
    vulnerabilityId: string;
    selectedAssets?: string[];
    onAssetSelectionChange?: (assets: string[]) => void;
    isCreating?: boolean;
}

export function AssetCard({ companyId, projectId, vulnerabilityId, selectedAssets = [], onAssetSelectionChange, isCreating = false }: AssetCardProps) {
    const [isAddAssetDialogOpen, setIsAddAssetDialogOpen] = useState(false);
    const [projectAssets, setProjectAssets] = useState<Asset[]>([]);
    const [vulnerabilityAssets, setVulnerabilityAssets] = useState<Asset[]>([]);

    const getAssetIcon = (type: string) => {
        switch (type) {
            case 'SERVER':
                return <Server className="h-4 w-4" />;
            case 'NETWORK_DEVICE':
                return <Network className="h-4 w-4" />;
            case 'WEB_APP':
                return <Globe className="h-4 w-4" />;
            case 'MOBILE_APP':
                return <Smartphone className="h-4 w-4" />;
            case 'API':
                return <HardDrive className="h-4 w-4" />;
            default:
                return <Package className="h-4 w-4" />;
        }
    };

    const fetchAssets = useCallback(async () => {
        if (!companyId || !projectId) return;
        
        // Always fetch project assets
        try {
            const projectAssetsResponse = await api.get(`/companies/${companyId}/projects/${projectId}/assets/`);
            const projectAssetsData = projectAssetsResponse.data;
            setProjectAssets(projectAssetsData && Array.isArray(projectAssetsData.results) ? projectAssetsData.results : []);
        } catch (error) {
            console.error('Failed to fetch project assets:', error);
        }
        
        // Only fetch vulnerability assets if not creating and we have a valid vulnerability ID
        if (!isCreating && vulnerabilityId !== "new") {
            try {
                const vulnerabilityAssetsResponse = await api.get(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/assets/`);
                const vulnAssetsData = vulnerabilityAssetsResponse.data;
                setVulnerabilityAssets(vulnAssetsData && Array.isArray(vulnAssetsData.results) ? vulnAssetsData.results.map((va: any) => va.asset_details) : []);
            } catch (error) {
                console.error('Failed to fetch vulnerability assets:', error);
            }
        }
    }, [companyId, projectId, vulnerabilityId, isCreating]);

    useEffect(() => {
        if (companyId && projectId) {
            fetchAssets();
        }
    }, [fetchAssets, companyId, projectId]);

    const handleAddAsset = async (assetId: string) => {
        if (isCreating) {
            // In creation mode, just update the selected assets
            const newSelectedAssets = [...selectedAssets, assetId];
            onAssetSelectionChange?.(newSelectedAssets);
        } else {
            // In edit mode, make API call to attach asset
            try {
                await api.post(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/assets/`, { asset: assetId });
                // Refresh the asset lists
                await fetchAssets();
            } catch (error) {
                console.error('Failed to add asset:', error);
            }
        }
    };

    const handleRemoveAsset = async (assetId: string) => {
        if (isCreating) {
            // In creation mode, just update the selected assets
            const newSelectedAssets = selectedAssets.filter(id => id !== assetId);
            onAssetSelectionChange?.(newSelectedAssets);
        } else {
            // In edit mode, make API call to detach asset
            try {
                // Find the vulnerability-asset link ID
                const response = await api.get(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/assets/`);
                const vulnAssetsData = response.data;
                
                if (vulnAssetsData && Array.isArray(vulnAssetsData.results)) {
                    const vulnerabilityAsset = vulnAssetsData.results.find((va: any) => va.asset_details.id === assetId);
                    if (vulnerabilityAsset) {
                        await api.delete(`/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/assets/${vulnerabilityAsset.id}/`);
                        // Refresh the asset lists
                        await fetchAssets();
                    }
                }
            } catch (error) {
                console.error('Failed to detach asset:', error);
            }
        }
    };

    // Determine which assets to display
    const displayAssets = isCreating 
        ? projectAssets.filter(asset => selectedAssets.includes(asset.id))
        : vulnerabilityAssets;
    
    const availableAssets = isCreating 
        ? projectAssets.filter(asset => !selectedAssets.includes(asset.id))
        : projectAssets.filter(pa => !vulnerabilityAssets.some(va => va.id === pa.id));

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Affected Assets ({displayAssets.length})
                        </span>
                        <Button variant="outline" size="sm" onClick={() => setIsAddAssetDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {displayAssets.length > 0 ? (
                        <div className="space-y-2">
                            {displayAssets.map(asset => (
                                <div 
                                    key={asset.id} 
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex-shrink-0 text-muted-foreground">
                                            {getAssetIcon(asset.type || 'OTHER')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium truncate" title={asset.name}>
                                                {asset.name}
                                            </h3>
                                            {asset.identifier && (
                                                <p className="text-xs text-muted-foreground mt-1 truncate" title={asset.identifier}>
                                                    {asset.identifier}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveAsset(asset.id);
                                                    }}
                                                    className="cursor-pointer text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Remove
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No assets have been associated with this vulnerability.</p>
                    )}
                </CardContent>
            </Card>
            <AddAssetDialog
                isOpen={isAddAssetDialogOpen}
                onClose={() => setIsAddAssetDialogOpen(false)}
                onAddAsset={handleAddAsset}
                assets={availableAssets}
            />
        </>
    );
}
