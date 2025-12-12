'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EnhancedSelect } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/ui/table-pagination';
import { CompanyCreateDialog } from '@/components/companies/company-create-dialog';
import { CompanyEditDialog } from '@/components/companies/company-edit-dialog';
import { CompanyDeleteDialog } from '@/components/companies/company-delete-dialog';
import { CompanyStatusBadge } from '@/components/companies/company-status-badge';
import { Building2, Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const ITEMS_PER_PAGE = 10;

interface Company {
    id: string;
    name: string;
    contact_email: string;
    address: string;
    notes: string;
    is_active: boolean;
    project_count?: number;
    asset_count?: number;
    created_at: string;
    updated_at: string;
}

export default function CompaniesPage() {
    const router = useRouter();
    const { isAdmin, isTester, isClient, loading: authLoading } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const res = await api.get('/companies/');
            const companyData = res.data.results || res.data;
            
            // Filter inactive companies for non-admin users
            const filteredData = isAdmin ? companyData : companyData.filter((company: Company) => company.is_active);
            
            setCompanies(filteredData);
            setFilteredCompanies(filteredData);
        } catch (err: any) {
            console.error("Failed to fetch companies", err);
            setError('Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    useEffect(() => {
        let result = companies;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(company =>
                company.name.toLowerCase().includes(query) ||
                company.contact_email.toLowerCase().includes(query)
            );
        }

        if (statusFilter !== 'all') {
            const isActive = statusFilter === 'active';
            result = result.filter(company => company.is_active === isActive);
        }

        setFilteredCompanies(result);
        setCurrentPage(1); // Reset to first page on search/filter
    }, [searchQuery, statusFilter, companies]);

    const handleEditClick = (e: React.MouseEvent, company: Company) => {
        e.stopPropagation();
        setSelectedCompany(company);
        setEditDialogOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, company: Company) => {
        e.stopPropagation();
        setSelectedCompany(company);
        setDeleteDialogOpen(true);
    };

    const handleRowClick = (companyId: string) => {
        router.push(`/companies/${companyId}`);
    };

    // Pagination logic
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const showActions = isAdmin || isTester;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Companies</h1>
                    <p className="text-muted-foreground">
                        Manage and view all companies in the system.
                    </p>
                </div>
                {(isAdmin || isTester) && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Company
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search companies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <EnhancedSelect value={statusFilter} onValueChange={setStatusFilter} colorType="companyStatus">
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active" color="#22c55e">Active</SelectItem>
                        <SelectItem value="inactive" color="#ef4444">Inactive</SelectItem>
                    </SelectContent>
                </EnhancedSelect>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}</div>
            ) : filteredCompanies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border rounded-lg bg-muted/40">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No companies yet</h3>
                    <p className="text-muted-foreground mb-4">
                        {searchQuery ? 'No companies found matching your search.' : 'Create your first company to get started'}
                    </p>
                    {!searchQuery && (isAdmin || isTester) && (
                        <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Company
                        </Button>
                    )}
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Projects</TableHead>
                                <TableHead>Assets</TableHead>
                                <TableHead>Status</TableHead>
                                {showActions && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                            <TableBody>
                                {paginatedCompanies.map((company) => (
                                    <TableRow
                                        key={company.id}
                                        onClick={() => handleRowClick(company.id)}
                                        className="cursor-pointer hover:bg-muted/50"
                                    >
                                        <TableCell className="font-medium text-gray-900 dark:text-gray-100">{company.name}</TableCell>
                                        <TableCell>{company.contact_email}</TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-blue-50 text-blue-700 text-sm font-medium">
                                                {company.project_count || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-purple-50 text-purple-700 text-sm font-medium">
                                                {company.asset_count || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <CompanyStatusBadge status={company.is_active} />
                                        </TableCell>
                                        {showActions && (
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                    {(isAdmin || isTester) && (
                                                        <>
                                                            <Button variant="ghost" size="sm" onClick={(e) => handleEditClick(e, company)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={(e) => handleDeleteClick(e, company)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    <TablePagination
                        currentPage={currentPage}
                        totalItems={filteredCompanies.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}

            {(isAdmin || isTester) && (
                <>
                    <CompanyCreateDialog
                        open={createDialogOpen}
                        onOpenChange={setCreateDialogOpen}
                        onSuccess={fetchCompanies}
                    />

                    <CompanyEditDialog
                        company={selectedCompany}
                        open={editDialogOpen}
                        onOpenChange={setEditDialogOpen}
                        onSuccess={fetchCompanies}
                    />

                    <CompanyDeleteDialog
                        company={selectedCompany}
                        open={deleteDialogOpen}
                        onOpenChange={setDeleteDialogOpen}
                        onSuccess={fetchCompanies}
                    />
                </>
            )}
        </div>
    );
}
