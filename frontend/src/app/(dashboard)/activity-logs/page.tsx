'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Activity, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface ActivityLog {
    id: string;
    company: string;
    user: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    metadata: Record<string, any>;
    created_at: string;
}

interface PaginatedResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ActivityLog[];
}

const ACTION_COLORS: Record<string, string> = {
    STATUS_CHANGED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    CREATED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    UPDATED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    DELETED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
    VULNERABILITY: 'bg-red-500',
    REPORT: 'bg-blue-500',
    ASSET: 'bg-green-500',
    COMMENT: 'bg-purple-500',
};

export default function ActivityLogsPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 20;

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                setLoading(true);
                const res = await api.get<PaginatedResponse>('/activity-logs/', {
                    params: {
                        page,
                        page_size: pageSize,
                    }
                });
                setLogs(res.data.results);
                setTotalCount(res.data.count);
                setTotalPages(Math.ceil(res.data.count / pageSize));
            } catch (err: any) {
                console.error("Failed to fetch activity logs", err);
                if (err.response?.status === 403) {
                    setError("Access denied. Only administrators can view activity logs.");
                } else {
                    setError("Failed to load activity logs");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [page]);

    const handlePreviousPage = () => {
        if (page > 1) setPage(page - 1);
    };

    const handleNextPage = () => {
        if (page < totalPages) setPage(page + 1);
    };

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            <p>{error}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
                    <p className="text-muted-foreground mt-1">System-wide activity tracking</p>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                    <Activity className="h-4 w-4 mr-2" />
                    {totalCount} total logs
                </Badge>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        All system activities across all companies
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-8">No activity logs found</p>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                    <div
                                        className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center ${ENTITY_TYPE_COLORS[log.entity_type] || 'bg-gray-500'
                                            }`}
                                    >
                                        <Activity className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Badge className={ACTION_COLORS[log.action] || 'bg-gray-100'}>
                                                {log.action.replace(/_/g, ' ')}
                                            </Badge>
                                            <Badge variant="outline">
                                                {log.entity_type}
                                            </Badge>
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                            <span className="font-medium">Entity ID:</span> {log.entity_id}
                                        </div>
                                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                                            <div className="mt-1 text-sm">
                                                {Object.entries(log.metadata).map(([key, value]) => (
                                                    <span key={key} className="mr-3">
                                                        <span className="text-muted-foreground">{key}:</span>{' '}
                                                        <span className="font-medium">{String(value)}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-6 border-t">
                            <div className="text-sm text-muted-foreground">
                                Page {page} of {totalPages} ({totalCount} total logs)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreviousPage}
                                    disabled={page === 1 || loading}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={page === totalPages || loading}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
