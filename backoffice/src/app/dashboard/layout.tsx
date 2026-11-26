import { Sidebar } from "@/components/layout";
import { TopAlertBanner } from "@/components/alerts";
import { CopilotWidget } from "@/components/copilot";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen flex flex-col lg:flex-row font-sans antialiased overflow-hidden bg-[#f8fafc] text-slate-800">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
                <TopAlertBanner />
                {children}
            </main>
            <CopilotWidget />
        </div>
    );
}
