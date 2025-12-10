'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TablePagination } from '@/components/ui/table-pagination';
import { CompanyCreateDialog } from '@/components/companies/company-create-dialog';
import { CompanyEditDialog } from '@/components/companies/company-edit-dialog';
import { CompanyDeleteDialog } from '@/components/companies/company-delete-dialog';
import { Building2, Plus, Eye, Pencil, Trash2, Search } from 'lucide-react';
import Link from 'next/link';

const ITEMS_PER_PAGE = 10;

interface Company {
    id: string;
    name: string;
    slug: string;
    contact_email: string;
    address: string;
    notes: string;
    is_active: boolean;
    report_count?: number;
    asset_count?: number;
}

export default function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
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
            setCompanies(companyData);
            setFilteredCompanies(companyData);
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
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            setFilteredCompanies(companies.filter(company =>
                company.name.toLowerCase().includes(query) ||
                company.contact_email.toLowerCase().includes(query) ||
                company.slug.toLowerCase().includes(query)
            ));
        } else {
            setFilteredCompanies(companies);
        }
        setCurrentPage(1); // Reset to first page on search
    }, [searchQuery, companies]);

    const handleEditClick = (company: Company) => {
        setSelectedCompany(company);
        setEditDialogOpen(true);
    };

    const handleDeleteClick = (company: Company) => {
        setSelectedCompany(company);
        setDeleteDialogOpen(true);
    };

    // Pagination logic
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCompanies = filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Companies</h1>
                    <p className="text-muted-foreground">Manage client companies and organizations</p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Companies</CardTitle>
                            <CardDescription>
                                View and filter View and filter all companies
                            </CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search companies..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">{error}</div>
                    ) : filteredCompanies.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No companies yet</h3>
                            <p className="text-muted-foreground mb-4">
                                {searchQuery ? 'No companies found matching your search.' : 'Create your first company to get started'}
                            </p>
                            {!searchQuery && (
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
                                        <TableHead>Reports</TableHead>
                                        <TableHead>Assets</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedCompanies.map((company) => (
                                        <TableRow key={company.id}>
                                            <TableCell className="font-medium">{company.name}</TableCell>
                                            <TableCell>{company.contact_email}</TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-blue-50 text-blue-700 text-sm font-medium">
                                                    {company.report_count || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-purple-50 text-purple-700 text-sm font-medium">
                                                    {company.asset_count || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {company.is_active ? (
                                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
                                                        Inactive
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/companies/${company.id}`}>
                                                            <Eye className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(company)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(company)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
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
                </CardContent>
            </Card>

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
        </div>
    );
}
