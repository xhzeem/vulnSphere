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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EnhancedSelect } from '@/components/ui/select';
import api from '@/lib/api';

interface Project {
    id: string;
    company: string;
    title: string;
    engagement_type: string;
    status: string;
    start_date: string;
    end_date: string;
    summary: string;
}

interface ProjectEditDialogProps {
    project: Project | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ProjectEditDialog({ project, open, onOpenChange, onSuccess }: ProjectEditDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        engagement_type: '',
        status: '',
        start_date: '',
        end_date: '',
        summary: '',
    });

    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title,
                engagement_type: project.engagement_type,
                status: project.status || 'DRAFT',
                start_date: project.start_date,
                end_date: project.end_date,
                summary: project.summary || '',
            });
        }
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!project) return;

        setLoading(true);
        setError('');

        try {
            await api.patch(`/companies/${project.company}/projects/${project.id}/`, formData);
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail ||
                err.response?.data?.title?.[0] ||
                'Failed to update project';
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
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>Update project information</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="edit-title">Project Title *</Label>
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
                        <div className="grid gap-2">
                            <Label htmlFor="edit-status">Status *</Label>
                            <EnhancedSelect
                                value={formData.status}
                                onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                                colorType="projectStatus"
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DRAFT" color="#6b7280">Draft</SelectItem>
                                    <SelectItem value="IN_REVIEW" color="#3b82f6">In Review</SelectItem>
                                    <SelectItem value="FINAL" color="#22c55e">Final</SelectItem>
                                    <SelectItem value="ARCHIVED" color="#f97316">Archived</SelectItem>
                                </SelectContent>
                            </EnhancedSelect>
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
                            {loading ? 'Updating...' : 'Update Project'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
