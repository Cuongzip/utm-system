import { Sidebar } from "@/components/layout";
import { AlertCenterDrawer, AlertCenterTrigger, TopAlertBanner } from "@/components/alerts";
import { CopilotWidget } from "@/components/copilot";
import { LiveAlertsProvider } from "@/providers/LiveAlertsProvider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <LiveAlertsProvider>
            <div className="h-screen flex flex-col lg:flex-row font-sans antialiased overflow-hidden bg-[#f8fafc] text-slate-800">
                <Sidebar />
                <div className="relative flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#f8fafc]">
                    <main className="flex-1 flex flex-col min-w-0 overflow-y-auto utm-scroll">
                        {children}
                    </main>
                    <TopAlertBanner />
                </div>
                <AlertCenterTrigger variant="fab" />
                <CopilotWidget />
            </div>
            <AlertCenterDrawer />
        </LiveAlertsProvider>
    );
}
