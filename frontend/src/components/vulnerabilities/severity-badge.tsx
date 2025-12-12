import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
    severity: string;
    className?: string;
}

const SEVERITY_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
    CRITICAL: { 
        dot: "bg-red-500", 
        text: "text-red-700 dark:text-red-300", 
        bg: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" 
    },
    HIGH: { 
        dot: "bg-orange-500", 
        text: "text-orange-700 dark:text-orange-300", 
        bg: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" 
    },
    MEDIUM: { 
        dot: "bg-yellow-500", 
        text: "text-yellow-700 dark:text-yellow-300", 
        bg: "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800" 
    },
    LOW: { 
        dot: "bg-blue-500", 
        text: "text-blue-700 dark:text-blue-300", 
        bg: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" 
    },
    INFO: { 
        dot: "bg-green-500", 
        text: "text-green-700 dark:text-green-300", 
        bg: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800" 
    },
    UNCLASSIFIED: { 
        dot: "bg-gray-500", 
        text: "text-gray-700 dark:text-gray-300", 
        bg: "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800" 
    },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
    const colors = SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO;

    return (
        <Badge
            variant="outline"
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border",
                colors.bg,
                colors.text,
                className
            )}
        >
            <span className={cn("w-2 h-2 rounded-full", colors.dot)} />
            {severity.charAt(0) + severity.slice(1).toLowerCase()}
        </Badge>
    );
}
