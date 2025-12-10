'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Pencil, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { RetestCard } from '@/components/vulnerabilities/retest-card';

interface Vulnerability {
    id: string;
    title: string;
    severity: string;
    status: string;
    cvss_base_score: number | null;
    cvss_vector: string;
    details_md: string;
    references: string[];
    created_at: string;
    updated_at: string;
}

export default function VulnerabilityViewPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const vulnId = params.vulnId as string;

    const [vulnerability, setVulnerability] = useState<Vulnerability | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch project to get company ID
                const projectRes = await api.get(`/projects/${projectId}/`);
                setCompanyId(projectRes.data.company);

                // Fetch vulnerability
                const vulnRes = await api.get(
                    `/companies/${projectRes.data.company}/projects/${projectId}/vulnerabilities/${vulnId}/`
                );
                setVulnerability(vulnRes.data);
            } catch (err) {
                console.error('Failed to load vulnerability', err);
                setError('Failed to load vulnerability');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [projectId, vulnId]);

    const getSeverityBadge = (severity: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
            CRITICAL: { variant: 'destructive', className: 'bg-red-600 hover:bg-red-700' },
            HIGH: { variant: 'destructive', className: 'bg-orange-600 hover:bg-orange-700' },
            MEDIUM: { variant: 'default', className: 'bg-yellow-600 hover:bg-yellow-700' },
            LOW: { variant: 'secondary', className: 'bg-blue-600 hover:bg-blue-700' },
            INFO: { variant: 'outline', className: '' },
        };
        const config = variants[severity] || variants.INFO;
        return <Badge variant={config.variant} className={config.className}>{severity}</Badge>;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            OPEN: 'destructive',
            IN_PROGRESS: 'secondary',
            RESOLVED: 'default',
            ACCEPTED_RISK: 'outline',
            FALSE_POSITIVE: 'outline',
        };
        return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">Loading...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !vulnerability) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-destructive">{error || 'Vulnerability not found'}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{vulnerability.title}</h1>
                    </div>
                </div>
                <Button onClick={() => router.push(`/project/${projectId}/vulnerabilities/${vulnId}/edit`)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                </Button>
            </div>

            {/* Overview Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Severity</p>
                            <div className="mt-1">{getSeverityBadge(vulnerability.severity)}</div>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <div className="mt-1">{getStatusBadge(vulnerability.status)}</div>
                        </div>
                        {vulnerability.cvss_base_score && (
                            <div>
                                <p className="text-sm text-muted-foreground">CVSS Score</p>
                                <p className="mt-1 font-medium">{vulnerability.cvss_base_score}</p>
                            </div>
                        )}
                        {vulnerability.cvss_vector && (
                            <div className="col-span-2">
                                <p className="text-sm text-muted-foreground">CVSS Vector</p>
                                <p className="mt-1 font-mono text-sm">{vulnerability.cvss_vector}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Details */}
            {vulnerability.details_md && (
                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="prose dark:prose-invert max-w-none">
                            <ReactMarkdown>{vulnerability.details_md}</ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* References */}
            {vulnerability.references && vulnerability.references.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>References</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {vulnerability.references.map((ref, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <a
                                        href={ref.startsWith('http') ? ref : `https://${ref}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                                    >
                                        {ref}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {companyId && projectId && vulnId && (
                <RetestCard
                    companyId={companyId}
                    projectId={projectId}
                    vulnerabilityId={vulnId}
                />
            )}
        </div>
    );
}
