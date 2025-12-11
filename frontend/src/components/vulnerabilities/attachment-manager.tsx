'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Edit, Trash2, FileText, Image as ImageIcon, File, Paperclip, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import api from '@/lib/api';

interface Attachment {
    id: string;
    file: string;
    file_name: string;
    description: string;
    uploaded_by: string;
    user_name: string;
    uploaded_at: string;
    file_size?: number;
    level?: 'project' | 'vulnerability'; // Track where this attachment came from
}

interface AttachmentManagerProps {
    companyId: string;
    projectId: string;
    vulnerabilityId?: string;
}

export interface AttachmentManagerRef {
    fetchAttachments: () => void;
}

export const AttachmentManager = forwardRef<AttachmentManagerRef, AttachmentManagerProps>(({ companyId, projectId, vulnerabilityId }, ref) => {
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingAttachment, setEditingAttachment] = useState<Attachment | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editForm, setEditForm] = useState({
        file_name: '',
        description: ''
    });

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        setUploading(true);

        try {
            // Create FormData for file upload
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_name', file.name);
            formData.append('description', `Uploaded directly: ${file.name}`);

            let url = `/companies/${companyId}/projects/${projectId}/attachments/`;
            
            // If vulnerabilityId is provided, upload to vulnerability-specific endpoint
            if (vulnerabilityId) {
                formData.append('vulnerability', vulnerabilityId);
                url = `/companies/${companyId}/projects/${projectId}/attachments/`;
            }

            console.log('Uploading file to:', url);
            const response = await api.post(url, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            console.log('Upload response:', response.data);
            
            // Refresh attachments list
            await fetchAttachments();
            
            // Reset file input
            event.target.value = '';
            
        } catch (error) {
            console.error('File upload failed:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // Fetch attachments
    const fetchAttachments = async () => {
        console.log('fetchAttachments called in AttachmentManager');
        try {
            setLoading(true);
            let attachmentsData: Attachment[] = [];
            
            // First, try to fetch vulnerability-specific attachments if vulnerabilityId is provided
            if (vulnerabilityId) {
                try {
                    const vulnUrl = `/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/attachments/`;
                    console.log('Fetching vulnerability attachments from:', vulnUrl);
                    const vulnResponse = await api.get(vulnUrl);
                    console.log('Vulnerability attachments response:', vulnResponse.data);
                    
                    let vulnAttachments = vulnResponse.data;
                    if (vulnAttachments && typeof vulnAttachments === 'object') {
                        if (vulnAttachments.results && Array.isArray(vulnAttachments.results)) {
                            vulnAttachments = vulnAttachments.results;
                        } else if (Array.isArray(vulnAttachments)) {
                            vulnAttachments = vulnAttachments;
                        } else {
                            vulnAttachments = Object.values(vulnAttachments);
                        }
                    }
                    
                    if (Array.isArray(vulnAttachments) && vulnAttachments.length > 0) {
                        attachmentsData = vulnAttachments.map(a => ({ ...a, level: 'vulnerability' as const }));
                        console.log('Using vulnerability attachments:', attachmentsData);
                    }
                } catch (vulnError) {
                    console.log('No vulnerability attachments found, fetching project attachments...');
                }
            }
            
            // If no vulnerability attachments or no vulnerabilityId, fetch project attachments
            if (attachmentsData.length === 0) {
                const projUrl = `/companies/${companyId}/projects/${projectId}/attachments/`;
                console.log('Fetching project attachments from:', projUrl);
                const projResponse = await api.get(projUrl);
                console.log('Project attachments response:', projResponse.data);
                
                let projectAttachments = projResponse.data;
                if (projectAttachments && typeof projectAttachments === 'object') {
                    if (projectAttachments.results && Array.isArray(projectAttachments.results)) {
                        projectAttachments = projectAttachments.results;
                    } else if (Array.isArray(projectAttachments)) {
                        projectAttachments = projectAttachments;
                    } else {
                        projectAttachments = Object.values(projectAttachments);
                    }
                }
                
                attachmentsData = (Array.isArray(projectAttachments) ? projectAttachments : []).map(a => ({ ...a, level: 'project' as const }));
                console.log('Using project attachments:', attachmentsData);
            }
            
            setAttachments(attachmentsData);
        } catch (error) {
            console.error('Failed to fetch attachments:', error);
            setAttachments([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttachments();
    }, [companyId, projectId, vulnerabilityId]);

    // Expose fetchAttachments method via ref
    useImperativeHandle(ref, () => ({
        fetchAttachments
    }), [fetchAttachments]);

    // Handle file upload
    const handleDelete = async (attachment: Attachment) => {
        try {
            let url: string;
            
            // Use the attachment's level to determine the correct endpoint
            if (attachment.level === 'vulnerability') {
                url = `/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/attachments/${attachment.id}/`;
            } else {
                url = `/companies/${companyId}/projects/${projectId}/attachments/${attachment.id}/`;
            }

            console.log('Deleting attachment at:', url);
            await api.delete(url);
            setAttachments(attachments.filter(a => a.id !== attachment.id));
            setDeleteDialogOpen(false);
            setAttachmentToDelete(null);
        } catch (error: any) {
            console.error('Failed to delete attachment:', error);
            
            // If the primary endpoint fails, try the other endpoint as fallback
            if (attachment.level === 'vulnerability' && error.response?.status === 404) {
                try {
                    console.log('Trying project-level endpoint as fallback...');
                    const fallbackUrl = `/companies/${companyId}/projects/${projectId}/attachments/${attachment.id}/`;
                    console.log('Fallback URL:', fallbackUrl);
                    
                    await api.delete(fallbackUrl);
                    setAttachments(attachments.filter(a => a.id !== attachment.id));
                    setDeleteDialogOpen(false);
                    setAttachmentToDelete(null);
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    alert('Failed to delete attachment. The attachment might not be deletable at this level.');
                }
            } else if (attachment.level === 'project' && error.response?.status === 404) {
                try {
                    console.log('Trying vulnerability-level endpoint as fallback...');
                    if (vulnerabilityId) {
                        const fallbackUrl = `/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/attachments/${attachment.id}/`;
                        console.log('Fallback URL:', fallbackUrl);
                        
                        await api.delete(fallbackUrl);
                        setAttachments(attachments.filter(a => a.id !== attachment.id));
                        setDeleteDialogOpen(false);
                        setAttachmentToDelete(null);
                    }
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    alert('Failed to delete attachment. The attachment might not be deletable at this level.');
                }
            } else {
                alert('Failed to delete attachment. Please try again.');
            }
        }
    };

    // Edit attachment
    const handleEdit = async () => {
        if (!editingAttachment) return;

        try {
            let url: string;
            
            // Use the attachment's level to determine the correct endpoint
            if (editingAttachment.level === 'vulnerability') {
                url = `/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/attachments/${editingAttachment.id}/`;
            } else {
                url = `/companies/${companyId}/projects/${projectId}/attachments/${editingAttachment.id}/`;
            }

            console.log('Editing attachment at:', url);
            console.log('Edit data:', editForm);
            
            await api.patch(url, editForm);
            setAttachments(attachments.map(a => 
                a.id === editingAttachment.id 
                    ? { ...a, ...editForm }
                    : a
            ));
            setEditDialogOpen(false);
            setEditingAttachment(null);
            setEditForm({ file_name: '', description: '' });
        } catch (error: any) {
            console.error('Failed to update attachment:', error);
            
            // If the primary endpoint fails, try the other endpoint as fallback
            if (editingAttachment.level === 'vulnerability' && error.response?.status === 404) {
                try {
                    console.log('Trying project-level endpoint as fallback...');
                    const fallbackUrl = `/companies/${companyId}/projects/${projectId}/attachments/${editingAttachment.id}/`;
                    console.log('Fallback URL:', fallbackUrl);
                    
                    await api.patch(fallbackUrl, editForm);
                    setAttachments(attachments.map(a => 
                        a.id === editingAttachment.id 
                            ? { ...a, ...editForm }
                            : a
                    ));
                    setEditDialogOpen(false);
                    setEditingAttachment(null);
                    setEditForm({ file_name: '', description: '' });
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    alert('Failed to update attachment. The attachment might not be editable at this level.');
                }
            } else if (editingAttachment.level === 'project' && error.response?.status === 404) {
                try {
                    console.log('Trying vulnerability-level endpoint as fallback...');
                    if (vulnerabilityId) {
                        const fallbackUrl = `/companies/${companyId}/projects/${projectId}/vulnerabilities/${vulnerabilityId}/attachments/${editingAttachment.id}/`;
                        console.log('Fallback URL:', fallbackUrl);
                        
                        await api.patch(fallbackUrl, editForm);
                        setAttachments(attachments.map(a => 
                            a.id === editingAttachment.id 
                                ? { ...a, ...editForm }
                                : a
                        ));
                        setEditDialogOpen(false);
                        setEditingAttachment(null);
                        setEditForm({ file_name: '', description: '' });
                    }
                } catch (fallbackError) {
                    console.error('Fallback also failed:', fallbackError);
                    alert('Failed to update attachment. The attachment might not be editable at this level.');
                }
            } else {
                alert('Failed to update attachment. Please try again.');
            }
        }
    };

    // Open edit dialog
    const openEditDialog = (attachment: Attachment) => {
        setEditingAttachment(attachment);
        setEditForm({
            file_name: attachment.file_name,
            description: attachment.description
        });
        setEditDialogOpen(true);
    };

    // Get file icon based on file type
    const getFileIcon = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension || '')) {
            return <ImageIcon className="h-4 w-4" />;
        } else if (['pdf'].includes(extension || '')) {
            return <FileText className="h-4 w-4" />;
        } else {
            return <File className="h-4 w-4" />;
        }
    };

    // Format file size
    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'Unknown';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Paperclip className="h-5 w-5" />
                            Attachments ({attachments.length})
                        </CardTitle>
                        <CardDescription>
                            Manage files uploaded to this {vulnerabilityId ? 'vulnerability' : 'project'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            disabled={uploading}
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading ? 'Uploading...' : 'Upload'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {attachments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Paperclip className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No attachments yet</p>
                        <p className="text-sm">Upload files using markdown editor or other upload features</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {attachments.map((attachment) => (
                            <Card key={attachment.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                <div className="aspect-square bg-muted relative">
                                    {attachment.file_name.match(/\.(jpg|jpeg|png|gif|bmp|svg|webp)$/i) ? (
                                        <img
                                            src={attachment.file}
                                            alt={attachment.file_name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                // Fallback to icon if image fails to load
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                            }}
                                        />
                                    ) : null}
                                    <div className="hidden w-full h-full flex items-center justify-center">
                                        {getFileIcon(attachment.file_name)}
                                        <span className="ml-1 text-xs text-muted-foreground">
                                            {attachment.file_name.split('.').pop()?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <CardContent className="p-2">
                                    <div className="space-y-1">
                                        <div className="flex items-start justify-between gap-1">
                                            <h3 className="font-medium text-xs truncate flex-1" title={attachment.file_name}>
                                                {attachment.file_name}
                                            </h3>
                                            {attachment.file_size && (
                                                <Badge variant="secondary" className="text-xs flex-shrink-0">
                                                    {formatFileSize(attachment.file_size)}
                                                </Badge>
                                            )}
                                        </div>
                                        {attachment.description && (
                                            <p className="text-xs text-muted-foreground overflow-hidden" style={{ 
                                                display: '-webkit-box',
                                                WebkitLineClamp: 1,
                                                WebkitBoxOrient: 'vertical'
                                            }} title={attachment.description}>
                                                {attachment.description}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="truncate">{formatDistanceToNow(new Date(attachment.uploaded_at), { addSuffix: true })}</span>
                                        </div>
                                        <div className="flex items-center gap-1 pt-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => window.open(attachment.file, '_blank')}
                                            >
                                                <Download className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => openEditDialog(attachment)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-xs"
                                                onClick={() => {
                                                    setAttachmentToDelete(attachment);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{attachmentToDelete?.file_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={() => attachmentToDelete && handleDelete(attachmentToDelete)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Edit Attachment Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Attachment</DialogTitle>
                            <DialogDescription>
                                Update the attachment details
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="file_name">File Name</Label>
                                <Input
                                    id="file_name"
                                    value={editForm.file_name}
                                    onChange={(e) => setEditForm({ ...editForm, file_name: e.target.value })}
                                    placeholder="Enter file name"
                                />
                            </div>
                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    placeholder="Enter description"
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleEdit}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
});

AttachmentManager.displayName = 'AttachmentManager';
