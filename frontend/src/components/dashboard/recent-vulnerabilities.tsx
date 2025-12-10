'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Vulnerability {
    id: string;
    title: string;
    severity: string;
    status: string;
    report_id: string;
    report_title: string;
    company_id: string;
    company_name: string;
    created_at: string;
}

interface RecentVulnerabilitiesProps {
    vulnerabilities: Vulnerability[];
}

const SEVERITY_COLORS = {
    CRITICAL: 'bg-red-500 hover:bg-red-600',
    HIGH: 'bg-orange-500 hover:bg-orange-600',
    MEDIUM: 'bg-yellow-500 hover:bg-yellow-600',
    LOW: 'bg-blue-500 hover:bg-blue-600',
    INFO: 'bg-gray-500 hover:bg-gray-600',
};

const STATUS_COLORS = {
    OPEN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    ACCEPTED_RISK: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    FALSE_POSITIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function RecentVulnerabilities({ vulnerabilities }: RecentVulnerabilitiesProps) {
    if (vulnerabilities.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Recent Vulnerabilities</CardTitle>
                    <CardDescription>Latest discovered vulnerabilities</CardDescription>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                    No vulnerabilities found
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Vulnerabilities</CardTitle>
                <CardDescription>Latest discovered vulnerabilities</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {vulnerabilities.map((vuln) => (
                        <div key={vuln.id} className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0">
                            <div className="space-y-1 flex-1">
                                <Link
                                    href={`/reports/${vuln.report_id}/vulnerabilities/${vuln.id}`}
                                    className="font-medium hover:underline"
                                >
                                    {vuln.title}
                                </Link>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <span>{vuln.report_title}</span>
                                    <span>•</span>
                                    <span>{vuln.company_name}</span>
                                    <span>•</span>
                                    <span>{formatDistanceToNow(new Date(vuln.created_at), { addSuffix: true })}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                                <Badge className={SEVERITY_COLORS[vuln.severity as keyof typeof SEVERITY_COLORS]}>
                                    {vuln.severity}
                                </Badge>
                                <Badge variant="outline" className={STATUS_COLORS[vuln.status as keyof typeof STATUS_COLORS]}>
                                    {vuln.status.replace('_', ' ')}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
