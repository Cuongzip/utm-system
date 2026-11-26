"use client";

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
    const onlinePct = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

    const items: KpiItem[] = [
        {
            id: "total-devices",
            label: "Registered Devices",
            value: totalDevices,
            subValue: `${Math.max(0, totalDevices - onlineDevices)} offline`,
            icon: Radio,
        },
        {
            id: "online-devices",
            label: "Online Links",
            value: onlineDevices,
            subValue: totalDevices > 0 ? `${onlinePct}% connected` : "Standby",
            icon: Wifi,
            statusDot: onlineDevices > 0 ? "online" : undefined,
        },
        {
            id: "mtls-certs",
            label: "mTLS Provisioned",
            value: certProvisionedCount,
            subValue: totalDevices > 0 ? `of ${totalDevices} devices` : "X.509 RSA-2048",
            icon: ShieldCheck,
        },
        {
            id: "routed-commands",
            label: "Commands Dispatched",
            value: totalRoutedCommands,
            subValue: "C2 downlink total",
            icon: Send,
        },
    ];

    return <KpiStrip items={items} loading={loading} columns={4} />;
}
