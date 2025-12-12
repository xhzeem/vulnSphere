import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    Building2,
    Ban
} from "lucide-react";

interface CompanyStatusBadgeProps {
    status: boolean;
    className?: string;
}

const COMPANY_STATUS_CONFIG: Record<string, { 
    icon: React.ComponentType<{ className?: string }>;
    text: string; 
    bg: string;
    textColor: string;
    borderColor: string;
}> = {
    active: { 
        icon: Building2, 
        text: "Active", 
        bg: "bg-green-50 dark:bg-green-950", 
        textColor: "text-green-700 dark:text-green-300",
        borderColor: "border-green-200 dark:border-green-800"
    },
    inactive: { 
        icon: Ban, 
        text: "Inactive", 
        bg: "bg-red-50 dark:bg-red-950", 
        textColor: "text-red-700 dark:text-red-300",
        borderColor: "border-red-200 dark:border-red-800"
    },
};

export function CompanyStatusBadge({ status, className }: CompanyStatusBadgeProps) {
    const statusKey = status ? 'active' : 'inactive';
    const config = COMPANY_STATUS_CONFIG[statusKey] || COMPANY_STATUS_CONFIG.active;
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
