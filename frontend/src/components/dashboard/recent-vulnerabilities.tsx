'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { SeverityBadge } from '@/components/vulnerabilities/severity-badge';
import { StatusBadge } from '@/components/vulnerabilities/status-badge';

interface Vulnerability {
    id: string;
    title: string;
    severity: string;
    status: string;
    project_id: string;
    project_title: string;
    company_id: string;
    company_name: string;
    created_at: string;
}

interface RecentVulnerabilitiesProps {
    vulnerabilities: Vulnerability[];
}

export function RecentVulnerabilities({ vulnerabilities }: RecentVulnerabilitiesProps) {
    if (vulnerabilities.length === 0) {
        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Recent Vulnerabilities</h2>
                    <p className="text-sm text-muted-foreground">Latest discovered vulnerabilities</p>
                </div>
                <div className="rounded-lg border bg-card text-muted-foreground p-8 text-center">
                    No vulnerabilities found
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Recent Vulnerabilities</h2>
                <p className="text-sm text-muted-foreground">Latest discovered vulnerabilities</p>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Vulnerability</TableHead>
                        <TableHead>Project / Company</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {vulnerabilities.map((vuln) => (
                        <TableRow key={vuln.id}>
                            <TableCell className="font-medium">
                                <Link
                                    href={`/project/${vuln.project_id}/vulnerabilities/${vuln.id}`}
                                    className="hover:underline"
                                >
                                    {vuln.title}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">{vuln.project_title}</span>
                                    <span>{vuln.company_name}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <SeverityBadge severity={vuln.severity} />
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={vuln.status} />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                {formatDistanceToNow(new Date(vuln.created_at), { addSuffix: true })}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
