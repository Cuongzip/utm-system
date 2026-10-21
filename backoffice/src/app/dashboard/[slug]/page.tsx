import { PageHeader } from "@/components/ui";
import { Construction, Sliders } from "lucide-react";
import Link from "next/link";

const TAB_TITLES: Record<string, string> = {
    dashboard: "Dashboard Overview",
    "control-center": "Control Center",
    connectivity: "Device Connectivity",
    missions: "Missions Operations",
    flights: "Flights Management",
    drones: "Drones Management",
    hubs: "Operations Hubs",
    airspace: "Airspace Sectors",
    conflicts: "Conflict Detection",
    settings: "System Settings",
};

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function GenericDashboardTab({ params }: Props) {
    const { slug } = await params;
    const title = TAB_TITLES[slug] || "UTM System";

    return (
        <div className="p-8 space-y-6">
            <PageHeader title={title} />
            <div className="octa-border-wrapper-lg tech-mark-tl-br min-h-[500px]">
                <div className="octa-lg bg-white p-12 flex flex-col items-center justify-center text-center h-full">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 mb-4 shadow-xs">
                        <Construction className="h-6 w-6 text-slate-600 animate-bounce" />
                    </div>
                    <h2 className="text-base font-bold font-mono text-slate-800">
                        {title} (Giao diện đang hoàn thiện)
                    </h2>
                    <p className="mt-2 max-w-md text-xs text-slate-500 font-mono">
                        Chỉ làm UI mẫu theo yêu cầu. Nhấn{" "}
                        <Link
                            href="/dashboard/control-center"
                            className="font-bold text-slate-800 underline inline-flex items-center gap-1 cursor-pointer"
                        >
                            <Sliders className="h-3 w-3" /> Control Center
                        </Link>{" "}
                        để xem bản đồ điều hành 2D/3D Globe và telemetry.
                    </p>
                </div>
            </div>
        </div>
    );
}
