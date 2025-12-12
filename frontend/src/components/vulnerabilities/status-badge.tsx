import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    AlertCircle, 
    Clock, 
    CheckCircle, 
    AlertTriangle, 
    XCircle,
    RotateCcw,
    Eye
} from "lucide-react";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

const STATUS_CONFIG: Record<string, { 
    icon: React.ComponentType<{ className?: string }>;
    text: string; 
    bg: string;
    textColor: string;
    borderColor: string;
}> = {
    OPEN: { 
        icon: AlertCircle, 
        text: "Open", 
        bg: "bg-red-50 dark:bg-red-950", 
        textColor: "text-red-700 dark:text-red-300",
        borderColor: "border-red-200 dark:border-red-800"
    },
    IN_PROGRESS: { 
        icon: Clock, 
        text: "In Progress", 
        bg: "bg-blue-50 dark:bg-blue-950", 
        textColor: "text-blue-700 dark:text-blue-300",
        borderColor: "border-blue-200 dark:border-blue-800"
    },
    RESOLVED: { 
        icon: CheckCircle, 
        text: "Resolved", 
        bg: "bg-green-50 dark:bg-green-950", 
        textColor: "text-green-700 dark:text-green-300",
        borderColor: "border-green-200 dark:border-green-800"
    },
    ACCEPTED_RISK: { 
        icon: AlertTriangle, 
        text: "Accepted Risk", 
        bg: "bg-yellow-50 dark:bg-yellow-950", 
        textColor: "text-yellow-700 dark:text-yellow-300",
        borderColor: "border-yellow-200 dark:border-yellow-800"
    },
    FALSE_POSITIVE: { 
        icon: XCircle, 
        text: "False Positive", 
        bg: "bg-gray-50 dark:bg-gray-950", 
        textColor: "text-gray-700 dark:text-gray-300",
        borderColor: "border-gray-200 dark:border-gray-800"
    },
    RETEST_PENDING: { 
        icon: RotateCcw, 
        text: "Retest Pending", 
        bg: "bg-purple-50 dark:bg-purple-950", 
        textColor: "text-purple-700 dark:text-purple-300",
        borderColor: "border-purple-200 dark:border-purple-800"
    },
    RETEST_FAILED: { 
        icon: XCircle, 
        text: "Retest Failed", 
        bg: "bg-red-50 dark:bg-red-950", 
        textColor: "text-red-700 dark:text-red-300",
        borderColor: "border-red-200 dark:border-red-800"
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.OPEN;
    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border",
                config.bg,
                config.textColor,
                config.borderColor,
                className
            )}
        >
            <Icon className="w-3 h-3" />
            {config.text}
        </Badge>
    );
}
