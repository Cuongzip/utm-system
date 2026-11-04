"use client";

import { cn } from "@/lib";

export type ConnectivitySubTab = "overview" | "devices" | "telemetry-modes";

interface ConnectivityTabsProps {
    activeTab: ConnectivitySubTab;
    onTabChange: (tab: ConnectivitySubTab) => void;
}

export function ConnectivityTabs({ activeTab, onTabChange }: ConnectivityTabsProps) {
    const tabs: { id: ConnectivitySubTab; label: string }[] = [
        { id: "overview", label: "Overview" },
        { id: "devices", label: "Devices" },
        { id: "telemetry-modes", label: "Telemetry Modes" },
    ];

    return (
        <div className="bg-slate-200/70 p-1 rounded-lg flex items-center gap-0.5 w-fit">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "text-xs leading-4 px-3.5 py-1.5 rounded-md transition-colors cursor-pointer border-none",
                        activeTab === tab.id
                            ? "bg-white text-slate-800 font-medium shadow-xs"
                            : "bg-transparent text-slate-600 hover:text-slate-800 font-normal"
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default ConnectivityTabs;
