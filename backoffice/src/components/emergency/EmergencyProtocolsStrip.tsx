"use client";

import { History, TrendingUp, ShieldCheck } from "lucide-react";
import { ChamferCard } from "@/components/ui";

export const EMERGENCY_MODAL_TABS = {
    HISTORY: "history",
    TRENDS: "trends",
    PROTOCOLS: "protocols",
} as const;

export type EmergencyProtocolType =
    (typeof EMERGENCY_MODAL_TABS)[keyof typeof EMERGENCY_MODAL_TABS];

export interface EmergencyProtocolsStripProps {
    onSelectProtocol: (type: EmergencyProtocolType) => void;
}

export function EmergencyProtocolsStrip({ onSelectProtocol }: EmergencyProtocolsStripProps) {
    const protocols = [
        {
            type: EMERGENCY_MODAL_TABS.HISTORY,
            title: "Incident History",
            description: "View all past incidents and investigations",
            icon: History,
        },
        {
            type: EMERGENCY_MODAL_TABS.TRENDS,
            title: "Trend Analysis",
            description: "Analyze patterns and identify issues",
            icon: TrendingUp,
        },
        {
            type: EMERGENCY_MODAL_TABS.PROTOCOLS,
            title: "Response Protocols",
            description: "Inspect active failsafe procedures and actions",
            icon: ShieldCheck,
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {protocols.map((item) => {
                const Icon = item.icon;
                return (
                    <ChamferCard
                        key={item.type}
                        size="md"
                        onClick={() => onSelectProtocol(item.type)}
                        className="h-[105px] cursor-pointer group transition-all hover:border-[var(--color-border-dark)]"
                    >
                        <div className="p-4 flex items-center gap-4 h-full">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-600 group-hover:bg-slate-200 transition-colors">
                                <Icon className="w-6 h-6 stroke-[1.75]" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h3 className="font-bold text-sm text-slate-900 group-hover:text-slate-800 tracking-tight">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5 leading-snug line-clamp-2">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    </ChamferCard>
                );
            })}
        </div>
    );
}
