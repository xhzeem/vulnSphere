'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Eye } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { TablePagination } from '@/components/ui/table-pagination';

interface Company {
    id: string;
    name: string;
    slug: string;
}

interface Report {
    id: string;
    title: string;
    company: string;
    engagement_type: string;
    status: string;
    start_date: string;
    end_date: string;
    created_at: string;
}

export default function ReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchData();
    }, [page, search, selectedCompany, selectedStatus]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = Cookies.get('access_token');

            // Fetch companies
            const companiesRes = await fetch('http://localhost:8000/api/v1/companies/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const companiesData = await companiesRes.json();
            setCompanies(companiesData.results || companiesData);

            // Build query params
            const params = new URLSearchParams({ page: page.toString() });
            if (search) params.append('search', search);

            // Fetch reports
            const reportsRes = await fetch(`http://localhost:8000/api/v1/reports/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const reportsData = await reportsRes.json();

            let filteredReports = reportsData.results || reportsData;

            // Client-side filtering for company and status
            if (selectedCompany !== 'all') {
                filteredReports = filteredReports.filter((r: Report) => r.company.toString() === selectedCompany);
            }
            if (selectedStatus !== 'all') {
                filteredReports = filteredReports.filter((r: Report) => r.status === selectedStatus);
            }

            setReports(filteredReports);
            setTotalCount(reportsData.count || filteredReports.length);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCompanyName = (companyId: string) => {
        return companies.find(c => c.id === companyId)?.name || `Company ${companyId}`;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            DRAFT: 'outline',
            IN_REVIEW: 'secondary',
            FINAL: 'default',
            ARCHIVED: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">All Reports</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Reports</CardTitle>
                    <CardDescription>View and filter all reports across companies</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search reports..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="All Companies" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Companies</SelectItem>
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id.toString()}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full md:w-[200px]">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                                <SelectItem value="FINAL">Final</SelectItem>
                                <SelectItem value="ARCHIVED">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : reports.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No reports found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    reports.map((report) => (
                                        <TableRow key={report.id}>
                                            <TableCell className="font-medium">{report.title}</TableCell>
                                            <TableCell>{getCompanyName(report.company)}</TableCell>
                                            <TableCell>{report.engagement_type}</TableCell>
                                            <TableCell>{getStatusBadge(report.status)}</TableCell>
                                            <TableCell>{new Date(report.start_date).toLocaleDateString()}</TableCell>
                                            <TableCell>{new Date(report.end_date).toLocaleDateString()}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/reports/${report.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>


                    <TablePagination
                        currentPage={page}
                        totalItems={totalCount}
                        itemsPerPage={20}
                        onPageChange={setPage}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
