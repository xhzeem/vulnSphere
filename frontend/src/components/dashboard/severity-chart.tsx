'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SeverityChartProps {
    data: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
}

const SEVERITY_COLORS = {
    critical: '#ef4444', // red-500
    high: '#f97316',    // orange-500
    medium: '#eab308',  // yellow-500
    low: '#3b82f6',     // blue-500
    info: '#6b7280',    // gray-500
};

export function SeverityChart({ data }: SeverityChartProps) {
    const chartData = [
        { name: 'Critical', value: data.critical, color: SEVERITY_COLORS.critical },
        { name: 'High', value: data.high, color: SEVERITY_COLORS.high },
        { name: 'Medium', value: data.medium, color: SEVERITY_COLORS.medium },
        { name: 'Low', value: data.low, color: SEVERITY_COLORS.low },
        { name: 'Info', value: data.info, color: SEVERITY_COLORS.info },
    ].filter(item => item.value > 0); // Only show non-zero values

    if (chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Vulnerability Distribution</CardTitle>
                    <CardDescription>By severity level</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
                    No vulnerability data available
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Vulnerability Distribution</CardTitle>
                <CardDescription>By severity level</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
