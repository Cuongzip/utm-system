"use client";

import { TelemetryDistribution } from "../TelemetryDistribution";
import { CommandQueue } from "../CommandQueue";
import { ConnectedDevicesPanel } from "../ConnectedDevicesPanel";
import type { DeviceRegistration } from "@/types";

export interface OverviewTabProps {
    onlineCount: number;
    offlineCount: number;
    onlineDevices: DeviceRegistration[];
    totalDevicesCount: number;
    loading?: boolean;
    onHeartbeat: (id: string) => void;
    onRevoke: (id: string) => void;
    onTroubleshootGateway: () => void;
    onProvisionEdgeAgent: () => void;
    onViewAllDevices: () => void;
}

export function OverviewTab({
    onlineCount,
    offlineCount,
    onlineDevices,
    totalDevicesCount,
    loading = false,
    onHeartbeat,
    onRevoke,
    onTroubleshootGateway,
    onProvisionEdgeAgent,
    onViewAllDevices,
}: OverviewTabProps) {
    return (
        <div className="space-y-6 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <TelemetryDistribution
                    frequencyBand="DUAL-BAND"
                    hasFeeds={onlineCount > 0}
                    byMode={{
                        idle: offlineCount,
                        normal: onlineCount,
                        enhanced: 0,
                        emergency: 0,
                    }}
                />
                <CommandQueue
                    latency="0ms"
                    pendingCount={0}
                    byPriority={{ 0: 0, 1: 0, 2: 0, 3: 0 }}
                />
            </div>

            <ConnectedDevicesPanel
                status={onlineCount > 0 ? `ONLINE (${onlineCount})` : "STANDBY"}
                devices={onlineDevices}
                registeredCount={totalDevicesCount}
                loading={loading}
                onHeartbeat={onHeartbeat}
                onRevoke={onRevoke}
                onTroubleshootGateway={onTroubleshootGateway}
                onProvisionEdgeAgent={onProvisionEdgeAgent}
                onViewAllDevices={onViewAllDevices}
            />
        </div>
    );
}
