"use client";

import { AlertTriangle, Clock, CheckCircle2, Activity } from "lucide-react";
import { MetricCard } from "@/components/ui";

export interface EmergencyKpiMetrics {
    activeCount: number;
    pendingCount: number;
    resolvedCount: number;
    avgResponseTime: number;
    isLoading?: boolean;
}

export function EmergencyKpiStrip({
    activeCount,
    pendingCount,
    resolvedCount,
    avgResponseTime,
    isLoading = false,
}: EmergencyKpiMetrics) {
    const kpiCards = [
        {
            id: "active-emergencies",
            title: "ACTIVE EMERGENCIES",
            value: isLoading ? "--" : String(activeCount).padStart(2, "0"),
            subValue: activeCount > 0 ? "ACTION REQUIRED" : "ALL CLEAR",
            icon: AlertTriangle,
            iconClassName: activeCount > 0 ? "text-rose-600" : "text-slate-400",
        },
        {
            id: "pending-confirmation",
            title: "PENDING CONFIRMATION",
            value: isLoading ? "--" : String(pendingCount).padStart(2, "0"),
            subValue: pendingCount > 0 ? "AWAITING OPERATOR" : "NONE",
            icon: Clock,
            iconClassName: pendingCount > 0 ? "text-amber-600" : "text-slate-400",
        },
        {
            id: "resolved-today",
            title: "RESOLVED TODAY",
            value: isLoading ? "--" : String(resolvedCount).padStart(2, "0"),
            subValue: "INCIDENTS",
            icon: CheckCircle2,
            iconClassName: "text-slate-400",
        },
        {
            id: "avg-response-time",
            title: "AVG RESPONSE TIME",
            value: isLoading ? "--" : `${avgResponseTime}s`,
            subValue: "AVG DURATION",
            icon: Activity,
            iconClassName: "text-slate-400",
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
            {kpiCards.map((card) => (
                <MetricCard
                    key={card.id}
                    title={card.title}
                    value={card.value}
                    subValue={card.subValue}
                    icon={card.icon}
                    iconClassName={card.iconClassName}
                />
            ))}
        </div>
    );
}
