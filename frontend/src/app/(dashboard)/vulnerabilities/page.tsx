'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Search, Eye } from 'lucide-react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { TablePagination } from '@/components/ui/table-pagination';
import { SeverityBadge } from '@/components/vulnerabilities/severity-badge';
import { StatusBadge } from '@/components/vulnerabilities/status-badge';

interface Company {
    id: string;
    name: string;
}

interface Project {
    id: string;
    title: string;
    company: string;
}

interface Vulnerability {
    id: string;
    title: string;
    severity: string;
    status: string;
    category: string;
    project: string;
    created_at: string;
}

export default function VulnerabilitiesPage() {
    const router = useRouter();
    const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string>('all');
    const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchData();
    }, [page, search]);

    useEffect(() => {
        filterVulnerabilities();
    }, [selectedCompany, selectedSeverity, selectedStatus]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = Cookies.get('access_token');

            // Fetch companies
            const companiesRes = await fetch('http://localhost:8000/api/v1/companies/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const companiesData = await companiesRes.json();
            const allCompanies = Array.isArray(companiesData.results) ? companiesData.results : Array.isArray(companiesData) ? companiesData : [];
            
            // Get user role to determine if we should filter inactive companies
            // For now, we'll assume we need to check user role - let me add this check
            const userRes = await fetch('http://localhost:8000/api/v1/users/me/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const userData = await userRes.json();
            const isAdmin = userData.role === 'ADMIN';
            
            // Filter inactive companies for non-admin users
            const filteredCompanies = isAdmin ? allCompanies : allCompanies.filter((company: any) => company.is_active);
            setCompanies(filteredCompanies);

            // Fetch projects
            const projectsRes = await fetch('http://localhost:8000/api/v1/projects/', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const projectsData = await projectsRes.json();
            const allProjects = Array.isArray(projectsData.results) ? projectsData.results : Array.isArray(projectsData) ? projectsData : [];
            
            // Filter projects to only show those from visible companies
            const filteredProjects = allProjects.filter((project: any) => 
                filteredCompanies.some((company: any) => company.id === project.company)
            );
            setProjects(filteredProjects);

            // Fetch all vulnerabilities from visible projects
            const allVulns: Vulnerability[] = [];

            for (const project of filteredProjects) {
                try {
                    const vulnsRes = await fetch(
                        `http://localhost:8000/api/v1/companies/${project.company}/projects/${project.id}/vulnerabilities/`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const vulnsData = await vulnsRes.json();
                    const vulns = vulnsData.results || vulnsData;
                    allVulns.push(...vulns);
                } catch (error) {
                    console.error(`Error fetching vulns for project ${project.id}:`, error);
                }
            }

            setVulnerabilities(allVulns);
            setTotalCount(allVulns.length);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterVulnerabilities = () => {
        // This will trigger a re-render with filtered data
    };

    const getFilteredVulnerabilities = () => {
        let filtered = vulnerabilities;

        if (search) {
            filtered = filtered.filter(v =>
                v.title.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (selectedCompany !== 'all') {
            const companyId = selectedCompany;
            const companyProjects = projects.filter(p => p.company === companyId).map(p => p.id);
            filtered = filtered.filter(v => companyProjects.includes(v.project));
        }

        if (selectedSeverity !== 'all') {
            filtered = filtered.filter(v => v.severity === selectedSeverity);
        }

        if (selectedStatus !== 'all') {
            filtered = filtered.filter(v => v.status === selectedStatus);
        }

        // Pagination
        const startIndex = (page - 1) * 12;
        return filtered.slice(startIndex, startIndex + 12);
    };

    const getCompanyName = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return 'Unknown';
        const company = companies.find(c => c.id === project.company);
        return company?.name || `Company ${project.company}`;
    };

    const getProjectTitle = (projectId: string) => {
        return projects.find(p => p.id === projectId)?.title || `Project ${projectId}`;
    };



    const filteredVulns = getFilteredVulnerabilities();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">All Vulnerabilities</h2>
                    <p className="text-muted-foreground">
                        View and filter all vulnerabilities across all projects.
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search vulnerabilities..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                        <SelectTrigger className="w-[180px]">
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
                    <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Severities" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Severities</SelectItem>
                            <SelectItem value="CRITICAL"><SeverityBadge severity="CRITICAL" grow /></SelectItem>
                            <SelectItem value="HIGH"><SeverityBadge severity="HIGH" grow /></SelectItem>
                            <SelectItem value="MEDIUM"><SeverityBadge severity="MEDIUM" grow /></SelectItem>
                            <SelectItem value="LOW"><SeverityBadge severity="LOW" grow /></SelectItem>
                            <SelectItem value="INFO"><SeverityBadge severity="INFO" grow /></SelectItem>
                            <SelectItem value="UNCLASSIFIED"><SeverityBadge severity="UNCLASSIFIED" grow /></SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="OPEN"><StatusBadge status="OPEN" grow /></SelectItem>
                            <SelectItem value="IN_PROGRESS"><StatusBadge status="IN_PROGRESS" grow /></SelectItem>
                            <SelectItem value="RESOLVED"><StatusBadge status="RESOLVED" grow /></SelectItem>
                            <SelectItem value="ACCEPTED_RISK"><StatusBadge status="ACCEPTED_RISK" grow /></SelectItem>
                            <SelectItem value="FALSE_POSITIVE"><StatusBadge status="FALSE_POSITIVE" grow /></SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                                Loading...
                            </TableCell>
                        </TableRow>
                    ) : filteredVulns.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No vulnerabilities found
                            </TableCell>
                        </TableRow>
                    ) : (
                        filteredVulns.map((vuln) => (
                            <TableRow
                                key={vuln.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => router.push(`/project/${vuln.project}/vulnerabilities/${vuln.id}`)}
                            >
                                <TableCell className="font-medium">{vuln.title}</TableCell>
                                <TableCell>{getCompanyName(vuln.project)}</TableCell>
                                <TableCell>{getProjectTitle(vuln.project)}</TableCell>
                                <TableCell>
                                    <SeverityBadge severity={vuln.severity} grow />
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={vuln.status} grow />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <TablePagination
                currentPage={page}
                totalItems={totalCount}
                itemsPerPage={12}
                onPageChange={setPage}
            />
        </div>
    );
}
