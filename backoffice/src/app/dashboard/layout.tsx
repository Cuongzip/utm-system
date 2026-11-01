import { Sidebar } from "@/components/layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen flex font-sans antialiased overflow-hidden bg-[#f8fafc] text-slate-800">
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
