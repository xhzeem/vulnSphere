import { Sidebar } from "@/components/layout/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <div className="flex-shrink-0">
                <Sidebar />
            </div>
            <main className="flex-1 overflow-y-auto bg-background">
                <div className="p-6 m-4 rounded-lg border bg-card shadow-sm">
                    {children}
                </div>
            </main>
        </div>
    )
}
