'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { ProjectStatusBadge } from '@/components/projects/project-status-badge';

interface Project {
    id: string;
    title: string;
    status: string;
    company_id: string;
    company_name: string;
    start_date: string;
    end_date: string;
    vulnerability_count: number;
    created_at: string;
}

interface RecentProjectsProps {
    projects: Project[];
}

export function RecentProjects({ projects }: RecentProjectsProps) {
    if (projects.length === 0) {
        return (
            <div className="space-y-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Recent Projects</h2>
                    <p className="text-sm text-muted-foreground">Latest security assessment projects</p>
                </div>
                <div className="rounded-lg border bg-card text-muted-foreground p-8 text-center">
                    No projects found
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Recent Projects</h2>
                <p className="text-sm text-muted-foreground">Latest security assessment projects</p>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vulnerabilities</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {projects.map((project) => (
                        <TableRow key={project.id}>
                            <TableCell className="font-medium">
                                <Link
                                    href={`/project/${project.id}`}
                                    className="hover:underline"
                                >
                                    {project.title}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <Link
                                    href={`/companies/${project.company_id}`}
                                    className="text-sm text-muted-foreground hover:underline"
                                >
                                    {project.company_name}
                                </Link>
                            </TableCell>
                            <TableCell>
                                <ProjectStatusBadge status={project.status} />
                            </TableCell>
                            <TableCell>
                                <span className="inline-flex items-center justify-center w-8 h-6 rounded-md bg-blue-50 text-blue-700 text-sm font-medium">
                                    {project.vulnerability_count || 0}
                                </span>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                                <div className="text-sm">
                                    {format(new Date(project.start_date), 'MMM d')} - {format(new Date(project.end_date), 'MMM d, yyyy')}
                                </div>
                                <div className="text-xs">
                                    Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
