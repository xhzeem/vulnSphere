'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, EnhancedSelect } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

import { Search, Plus, AlertCircle, Clock, CheckCircle, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
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
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedSeverity, setSelectedSeverity] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        fetchData();
    }, [currentPage, search]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedCompany, selectedSeverity, selectedStatus]);

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
            setTotalItems(allVulns.length);
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

        return filtered;
    };

    const getPaginatedVulnerabilities = () => {
        const filtered = getFilteredVulnerabilities();
        const startIndex = (currentPage - 1) * 12;
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



    const filteredVulns = getPaginatedVulnerabilities();
    const totalFilteredVulns = getFilteredVulnerabilities().length;

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

            <div className="flex flex-col md:flex-row gap-4">
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
                    <SelectTrigger className="w-full md:w-[180px]">
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
                <EnhancedSelect value={selectedSeverity} onValueChange={setSelectedSeverity} colorType="severity">
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Severities" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="CRITICAL" color="#ef4444">Critical</SelectItem>
                        <SelectItem value="HIGH" color="#f97316">High</SelectItem>
                        <SelectItem value="MEDIUM" color="#eab308">Medium</SelectItem>
                        <SelectItem value="LOW" color="#3b82f6">Low</SelectItem>
                        <SelectItem value="INFO" color="#22c55e">Info</SelectItem>
                        <SelectItem value="UNCLASSIFIED" color="#6b7280">Unclassified</SelectItem>
                    </SelectContent>
                </EnhancedSelect>
                <EnhancedSelect value={selectedStatus} onValueChange={setSelectedStatus} colorType="status">
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="OPEN" icon={<AlertCircle className="w-3 h-3" style={{ color: '#ef4444' }} />}>Open</SelectItem>
                        <SelectItem value="IN_PROGRESS" icon={<Clock className="w-3 h-3" style={{ color: '#3b82f6' }} />}>In Progress</SelectItem>
                        <SelectItem value="RESOLVED" icon={<CheckCircle className="w-3 h-3" style={{ color: '#22c55e' }} />}>Resolved</SelectItem>
                        <SelectItem value="ACCEPTED_RISK" icon={<AlertTriangle className="w-3 h-3" style={{ color: '#eab308' }} />}>Accepted Risk</SelectItem>
                        <SelectItem value="FALSE_POSITIVE" icon={<XCircle className="w-3 h-3" style={{ color: '#6b7280' }} />}>False Positive</SelectItem>
                        <SelectItem value="RETEST_PENDING" icon={<RotateCcw className="w-3 h-3" style={{ color: '#a855f7' }} />}>Retest Pending</SelectItem>
                        <SelectItem value="RETEST_FAILED" icon={<XCircle className="w-3 h-3" style={{ color: '#ef4444' }} />}>Retest Failed</SelectItem>
                    </SelectContent>
                </EnhancedSelect>
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
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
                                <TableCell className="font-medium">
                                    <Link href={`/vulnerability/${vuln.id}`} className="hover:text-primary">
                                        {vuln.title}
                                    </Link>
                                </TableCell>
                                <TableCell>{getCompanyName(vuln.project)}</TableCell>
                                <TableCell>{getProjectTitle(vuln.project)}</TableCell>
                                <TableCell>
                                    <SeverityBadge severity={vuln.severity} />
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={vuln.status} />
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <TablePagination
                currentPage={currentPage}
                totalItems={totalFilteredVulns}
                itemsPerPage={12}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}
