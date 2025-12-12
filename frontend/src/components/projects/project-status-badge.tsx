import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    FileText, 
    Eye, 
    CheckCircle, 
    Archive,
    AlertCircle
} from "lucide-react";

interface ProjectStatusBadgeProps {
    status: string;
    className?: string;
}

const PROJECT_STATUS_CONFIG: Record<string, { 
    icon: React.ComponentType<{ className?: string }>;
    text: string; 
    bg: string;
    textColor: string;
    borderColor: string;
}> = {
    DRAFT: { 
        icon: FileText, 
        text: "Draft", 
        bg: "bg-gray-50 dark:bg-gray-950", 
        textColor: "text-gray-700 dark:text-gray-300",
        borderColor: "border-gray-200 dark:border-gray-800"
    },
    IN_REVIEW: { 
        icon: Eye, 
        text: "In Review", 
        bg: "bg-blue-50 dark:bg-blue-950", 
        textColor: "text-blue-700 dark:text-blue-300",
        borderColor: "border-blue-200 dark:border-blue-800"
    },
    FINAL: { 
        icon: CheckCircle, 
        text: "Final", 
        bg: "bg-green-50 dark:bg-green-950", 
        textColor: "text-green-700 dark:text-green-300",
        borderColor: "border-green-200 dark:border-green-800"
    },
    ARCHIVED: { 
        icon: Archive, 
        text: "Archived", 
        bg: "bg-orange-50 dark:bg-orange-950", 
        textColor: "text-orange-700 dark:text-orange-300",
        borderColor: "border-orange-200 dark:border-orange-800"
    },
};

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
    const config = PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.DRAFT;
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
