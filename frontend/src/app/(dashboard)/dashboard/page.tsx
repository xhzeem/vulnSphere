'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { StatCard } from '@/components/dashboard/stat-card';
import { SeverityChart } from '@/components/dashboard/severity-chart';
import { TrendChart } from '@/components/dashboard/trend-chart';
import { RecentVulnerabilities } from '@/components/dashboard/recent-vulnerabilities';
import { RecentReports } from '@/components/dashboard/recent-reports';
import { Bug, FileText, AlertTriangle, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
    total_vulnerabilities: number;
    total_reports: number;
    critical_vulnerabilities: number;
    recent_activity_count: number;
    severity_distribution: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
    status_distribution: {
        open: number;
        in_progress: number;
        resolved: number;
        accepted_risk: number;
        false_positive: number;
    };
    recent_vulnerabilities: any[];
    recent_reports: any[];
    vulnerability_trend: {
        date: string;
        count: number;
    }[];
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/overview/');
                setStats(res.data);
            } catch (err) {
                console.error("Failed to fetch dashboard stats", err);
                setError("Failed to load dashboard data");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <div className="text-destructive">{error}</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Vulnerabilities"
                    value={stats?.total_vulnerabilities ?? 0}
                    icon={Bug}
                    loading={loading}
                    iconColor="text-red-500"
                />
                <StatCard
                    title="Total Reports"
                    value={stats?.total_reports ?? 0}
                    icon={FileText}
                    loading={loading}
                    iconColor="text-blue-500"
                />
                <StatCard
                    title="Critical Issues"
                    value={stats?.critical_vulnerabilities ?? 0}
                    icon={AlertTriangle}
                    loading={loading}
                    iconColor="text-orange-500"
                />
                <StatCard
                    title="Recent Activity (7d)"
                    value={stats?.recent_activity_count ?? 0}
                    icon={Activity}
                    loading={loading}
                    iconColor="text-green-500"
                />
            </div>

            {/* Charts */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-[400px]" />
                    <Skeleton className="h-[400px]" />
                </div>
            ) : stats ? (
                <div className="grid gap-4 md:grid-cols-2">
                    <SeverityChart data={stats.severity_distribution} />
                    <TrendChart data={stats.vulnerability_trend} />
                </div>
            ) : null}

            {/* Recent Activity */}
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-[300px]" />
                    <Skeleton className="h-[300px]" />
                </div>
            ) : stats ? (
                <div className="space-y-6">
                    <RecentVulnerabilities vulnerabilities={stats.recent_vulnerabilities} />
                    <RecentReports reports={stats.recent_reports} />
                </div>
            ) : null}
        </div>
    );
}
