"use client";

import { useTranslations } from "next-intl";
import { Radio, Wifi, ShieldCheck, Send } from "lucide-react";
import { KpiStrip, type KpiItem } from "@/components/ui";

export interface ConnectivityMetricsProps {
    totalDevices: number;
    onlineDevices: number;
    certProvisionedCount: number;
    totalRoutedCommands?: number;
    loading?: boolean;
}

export function ConnectivityMetrics({
    totalDevices = 0,
    onlineDevices = 0,
    certProvisionedCount = 0,
    totalRoutedCommands = 0,
    loading = false,
}: ConnectivityMetricsProps) {
    const t = useTranslations("connectivity.kpi");
    const onlinePct = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

    const items: KpiItem[] = [
        {
            id: "total-devices",
            label: t("registeredDevices"),
            value: totalDevices,
            subValue: t("offlineCount", { count: Math.max(0, totalDevices - onlineDevices) }),
            icon: Radio,
        },
        {
            id: "online-devices",
            label: t("onlineLinks"),
            value: onlineDevices,
            subValue: totalDevices > 0 ? t("pctConnected", { pct: onlinePct }) : t("standby"),
            icon: Wifi,
        },
        {
            id: "mtls-certs",
            label: t("mtlsProvisioned"),
            value: certProvisionedCount,
            subValue: totalDevices > 0 ? t("ofDevices", { total: totalDevices }) : "X.509 RSA-2048",
            icon: ShieldCheck,
        },
        {
            id: "routed-commands",
            label: t("commandsDispatched"),
            value: totalRoutedCommands,
            subValue: t("c2DownlinkTotal"),
            icon: Send,
        },
    ];

    return <KpiStrip items={items} loading={loading} columns={4} />;
}
