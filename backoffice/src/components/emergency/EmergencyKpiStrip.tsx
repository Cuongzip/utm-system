"use client";

import { AlertTriangle, Clock, CheckCircle2, Activity } from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";

export interface EmergencyKpiMetrics {
    activeCount: number;
    pendingCount: number;
    resolvedCount: number;
    avgResponseTime: number;
    isLoading: boolean;
}

export function EmergencyKpiStrip({
    activeCount,
    pendingCount,
    resolvedCount,
    avgResponseTime,
    isLoading = false,
}: EmergencyKpiMetrics) {
    const items: KpiItem[] = [
        {
            id: "active-emergencies",
            label: "Active Incidents",
            value: activeCount,
            subValue: activeCount > 0 ? "Action required" : "All clear",
            icon: AlertTriangle,
            iconClassName: activeCount > 0 ? "text-red-600" : undefined,
            statusDot: activeCount > 0 ? "critical" : undefined,
        },
        {
            id: "pending-confirmation",
            label: "Pending Confirmation",
            value: pendingCount,
            subValue: pendingCount > 0 ? "Awaiting operator" : "None",
            icon: Clock,
            iconClassName: pendingCount > 0 ? "text-amber-600" : undefined,
        },
        {
            id: "resolved",
            label: "Resolved",
            value: resolvedCount,
            subValue: "Total closed",
            icon: CheckCircle2,
        },
        {
            id: "avg-response-time",
            label: "Avg Response Time",
            value: `${avgResponseTime}s`,
            subValue: "Detection to action",
            icon: Activity,
        },
    ];

    return <KpiStrip items={items} loading={isLoading} columns={4} />;
}
