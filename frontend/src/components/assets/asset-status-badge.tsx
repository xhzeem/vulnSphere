import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
    Server,
    Ban,
    Shield,
    FileText,
    Globe,
    Database,
    Cloud,
    Lock
} from "lucide-react";

interface AssetStatusBadgeProps {
    status: boolean;
    className?: string;
}

const ASSET_STATUS_CONFIG: Record<string, { 
    icon: React.ComponentType<{ className?: string }>;
    text: string; 
    bg: string;
    textColor: string;
    borderColor: string;
}> = {
    active: { 
        icon: Server, 
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

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
    const statusKey = status ? 'active' : 'inactive';
    const config = ASSET_STATUS_CONFIG[statusKey] || ASSET_STATUS_CONFIG.active;
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
