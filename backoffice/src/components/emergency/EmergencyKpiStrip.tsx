"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Clock, CheckCircle2, Activity } from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";

interface EmergencyKpiMetrics {
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
    const t = useTranslations("emergency.kpi");
    const items: KpiItem[] = [
        {
            id: "active-emergencies",
            label: t("activeIncidents"),
            value: activeCount,
            subValue: activeCount > 0 ? t("actionRequired") : t("allClear"),
            icon: AlertTriangle,
        },
        {
            id: "pending-confirmation",
            label: t("pendingConfirmation"),
            value: pendingCount,
            subValue: pendingCount > 0 ? t("awaitingOperator") : t("none"),
            icon: Clock,
        },
        {
            id: "resolved",
            label: t("resolved"),
            value: resolvedCount,
            subValue: t("totalClosed"),
            icon: CheckCircle2,
        },
        {
            id: "avg-response-time",
            label: t("avgResponseTime"),
            value: `${avgResponseTime}s`,
            subValue: t("detectionToAction"),
            icon: Activity,
        },
    ];

    return <KpiStrip items={items} loading={isLoading} columns={4} />;
}
