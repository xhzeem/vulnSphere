'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { User, getUserFullName } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/ui/table-pagination';
import { UserCreateDialog } from '@/components/users/user-create-dialog';
import { UserEditDialog } from '@/components/users/user-edit-dialog';
import { UserDeleteDialog } from '@/components/users/user-delete-dialog';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users/');
            const userData = res.data.results || res.data;
            setUsers(userData);
            setFilteredUsers(userData);
        } catch (err: any) {
            console.error("Failed to fetch users", err);
            setError('Failed to load users. You may not have permission to view this page.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        let result = users;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(user =>
                user.email.toLowerCase().includes(query) ||
                user.username.toLowerCase().includes(query) ||
                user.name.toLowerCase().includes(query)
            );
        }

        if (roleFilter !== 'all') {
            result = result.filter(user => user.role === roleFilter);
        }

        setFilteredUsers(result);
        setCurrentPage(1); // Reset to first page on search
    }, [searchQuery, roleFilter, users]);

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setEditDialogOpen(true);
    };

    const handleDeleteClick = (user: User) => {
        setSelectedUser(user);
        setDeleteDialogOpen(true);
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
                    <p className="text-muted-foreground">
                        Manage and view all users in the system.
                    </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="TESTER">Tester</SelectItem>
                        <SelectItem value="CLIENT">Client</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
            ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/40 text-muted-foreground">
                    {searchQuery ? 'No users found matching your search.' : 'No users yet.'}
                </div>
            ) : (
                <>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.name}
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.username}</code>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            {user.role === 'ADMIN' ? (
                                                <Badge variant="default">Admin</Badge>
                                            ) : user.role === 'TESTER' ? (
                                                <Badge variant="secondary">Tester</Badge>
                                            ) : (
                                                <Badge variant="outline">Client</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.is_active ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditClick(user)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteClick(user)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <TablePagination
                        currentPage={currentPage}
                        totalItems={filteredUsers.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            <UserCreateDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={fetchUsers}
            />

            <UserEditDialog
                user={selectedUser}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSuccess={fetchUsers}
            />

            <UserDeleteDialog
                user={selectedUser}
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onSuccess={fetchUsers}
            />
        </div>
    );
}
