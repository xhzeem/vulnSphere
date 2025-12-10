'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';

interface CVSSCalculatorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCalculate: (score: number, vector: string, severity: string) => void;
    initialVector?: string;
}

interface CVSSMetrics {
    // Base Metrics
    AV: string; // Attack Vector
    AC: string; // Attack Complexity
    PR: string; // Privileges Required
    UI: string; // User Interaction
    S: string;  // Scope
    C: string;  // Confidentiality
    I: string;  // Integrity
    A: string;  // Availability
}

export function CVSSCalculator({ open, onOpenChange, onCalculate, initialVector }: CVSSCalculatorProps) {
    const [metrics, setMetrics] = useState<CVSSMetrics>({
        AV: 'N',
        AC: 'L',
        PR: 'N',
        UI: 'N',
        S: 'U',
        C: 'H',
        I: 'H',
        A: 'H',
    });

    const [score, setScore] = useState<number>(0);
    const [severity, setSeverity] = useState<string>('None');

    useEffect(() => {
        if (initialVector) {
            parseVector(initialVector);
        }
    }, [initialVector]);

    useEffect(() => {
        calculateScore();
    }, [metrics]);

    const parseVector = (vector: string) => {
        const parts = vector.replace('CVSS:3.1/', '').split('/');
        const parsed: Partial<CVSSMetrics> = {};

        parts.forEach(part => {
            const [key, value] = part.split(':');
            if (key in metrics) {
                parsed[key as keyof CVSSMetrics] = value;
            }
        });

        setMetrics({ ...metrics, ...parsed });
    };

    const calculateScore = () => {
        // CVSS v3.1 calculation
        const impact = calculateImpact();
        const exploitability = calculateExploitability();

        let baseScore = 0;

        if (impact <= 0) {
            baseScore = 0;
        } else {
            if (metrics.S === 'U') {
                baseScore = Math.min(impact + exploitability, 10);
            } else {
                baseScore = Math.min(1.08 * (impact + exploitability), 10);
            }
        }

        const roundedScore = Math.ceil(baseScore * 10) / 10;
        setScore(roundedScore);

        // Determine severity
        if (roundedScore === 0) setSeverity('None');
        else if (roundedScore < 4.0) setSeverity('Low');
        else if (roundedScore < 7.0) setSeverity('Medium');
        else if (roundedScore < 9.0) setSeverity('High');
        else setSeverity('Critical');
    };

    const calculateImpact = () => {
        const C = metrics.C === 'H' ? 0.56 : metrics.C === 'L' ? 0.22 : 0;
        const I = metrics.I === 'H' ? 0.56 : metrics.I === 'L' ? 0.22 : 0;
        const A = metrics.A === 'H' ? 0.56 : metrics.A === 'L' ? 0.22 : 0;

        const impactSubScore = 1 - ((1 - C) * (1 - I) * (1 - A));

        if (metrics.S === 'U') {
            return 6.42 * impactSubScore;
        } else {
            return 7.52 * (impactSubScore - 0.029) - 3.25 * Math.pow(impactSubScore - 0.02, 15);
        }
    };

    const calculateExploitability = () => {
        const AV = metrics.AV === 'N' ? 0.85 : metrics.AV === 'A' ? 0.62 : metrics.AV === 'L' ? 0.55 : 0.2;
        const AC = metrics.AC === 'L' ? 0.77 : 0.44;

        let PR = 0;
        if (metrics.S === 'U') {
            PR = metrics.PR === 'N' ? 0.85 : metrics.PR === 'L' ? 0.62 : 0.27;
        } else {
            PR = metrics.PR === 'N' ? 0.85 : metrics.PR === 'L' ? 0.68 : 0.5;
        }

        const UI = metrics.UI === 'N' ? 0.85 : 0.62;

        return 8.22 * AV * AC * PR * UI;
    };

    const getVector = () => {
        return `CVSS:3.1/AV:${metrics.AV}/AC:${metrics.AC}/PR:${metrics.PR}/UI:${metrics.UI}/S:${metrics.S}/C:${metrics.C}/I:${metrics.I}/A:${metrics.A}`;
    };

    const handleApply = () => {
        onCalculate(score, getVector(), severity.toUpperCase());
        onOpenChange(false);
    };

    const getSeverityColor = () => {
        switch (severity) {
            case 'Critical': return 'bg-red-600';
            case 'High': return 'bg-orange-600';
            case 'Medium': return 'bg-yellow-600';
            case 'Low': return 'bg-blue-600';
            default: return 'bg-gray-600';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        CVSS v3.1 Calculator
                    </DialogTitle>
                    <DialogDescription>
                        Calculate the Common Vulnerability Scoring System score
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Score Display */}
                    <div className="flex items-center justify-center gap-4 p-6 bg-muted rounded-lg">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Base Score</p>
                            <p className="text-5xl font-bold">{score.toFixed(1)}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-2">Severity</p>
                            <Badge className={`${getSeverityColor()} text-white text-lg px-4 py-2`}>
                                {severity}
                            </Badge>
                        </div>
                    </div>

                    {/* Vector String */}
                    <div>
                        <Label className="text-sm text-muted-foreground">Vector String</Label>
                        <p className="font-mono text-sm mt-1 p-2 bg-muted rounded">{getVector()}</p>
                    </div>

                    {/* Base Metrics */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">Base Metrics</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Attack Vector (AV)</Label>
                                <Select value={metrics.AV} onValueChange={(v) => setMetrics({ ...metrics, AV: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="N">Network</SelectItem>
                                        <SelectItem value="A">Adjacent</SelectItem>
                                        <SelectItem value="L">Local</SelectItem>
                                        <SelectItem value="P">Physical</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Attack Complexity (AC)</Label>
                                <Select value={metrics.AC} onValueChange={(v) => setMetrics({ ...metrics, AC: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="L">Low</SelectItem>
                                        <SelectItem value="H">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Privileges Required (PR)</Label>
                                <Select value={metrics.PR} onValueChange={(v) => setMetrics({ ...metrics, PR: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="N">None</SelectItem>
                                        <SelectItem value="L">Low</SelectItem>
                                        <SelectItem value="H">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>User Interaction (UI)</Label>
                                <Select value={metrics.UI} onValueChange={(v) => setMetrics({ ...metrics, UI: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="N">None</SelectItem>
                                        <SelectItem value="R">Required</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Scope (S)</Label>
                                <Select value={metrics.S} onValueChange={(v) => setMetrics({ ...metrics, S: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="U">Unchanged</SelectItem>
                                        <SelectItem value="C">Changed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <h4 className="font-semibold mt-4">Impact Metrics</h4>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Confidentiality (C)</Label>
                                <Select value={metrics.C} onValueChange={(v) => setMetrics({ ...metrics, C: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="H">High</SelectItem>
                                        <SelectItem value="L">Low</SelectItem>
                                        <SelectItem value="N">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Integrity (I)</Label>
                                <Select value={metrics.I} onValueChange={(v) => setMetrics({ ...metrics, I: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="H">High</SelectItem>
                                        <SelectItem value="L">Low</SelectItem>
                                        <SelectItem value="N">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Availability (A)</Label>
                                <Select value={metrics.A} onValueChange={(v) => setMetrics({ ...metrics, A: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="H">High</SelectItem>
                                        <SelectItem value="L">Low</SelectItem>
                                        <SelectItem value="N">None</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleApply}>
                            Apply Score
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
