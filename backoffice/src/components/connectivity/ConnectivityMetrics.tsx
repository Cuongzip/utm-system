"use client";

import { Radio, Wifi, Activity, CheckCircle2 } from "lucide-react";
import { MetricCard } from "@/components/ui";

export interface ConnectivityMetricsProps {
    totalDevices?: number;
    activeDevices?: number;
    onlineDevices?: number;
    pendingCommands?: number;
    protocolStatusCount?: number;
}

export function ConnectivityMetrics({
    totalDevices = 0,
    activeDevices = 0,
    onlineDevices = 0,
    pendingCommands = 0,
    protocolStatusCount = 0,
}: ConnectivityMetricsProps) {
    const onlinePercent = totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <MetricCard
                title="TOTAL DEVICES"
                value={totalDevices}
                subValue={`${activeDevices} active`}
                subValuePosition="bottom"
                icon={Radio}
            />

            <MetricCard
                title="ONLINE"
                value={onlineDevices}
                icon={Wifi}
                iconClassName="text-emerald-600"
            >
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${onlinePercent}%` }}
                    />
                </div>
            </MetricCard>

            <MetricCard
                title="PENDING COMMANDS"
                value={pendingCommands}
                subValue="In queue for delivery"
                subValuePosition="bottom"
                icon={Activity}
            />

            <MetricCard
                title="PROTOCOL STATUS"
                value={protocolStatusCount}
                subValue="WebSocket connections"
                subValuePosition="bottom"
                icon={CheckCircle2}
                iconClassName="text-emerald-600"
            />
        </div>
    );
}
