"use client";

import { WifiOff, Activity, Trash2, Loader2 } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState } from "@/components/ui";
import type { DeviceRegistration } from "@/types";
import { formatRelativeTime } from "@/utils";

interface ConnectedDevicesPanelProps {
    status?: string;
    devices?: DeviceRegistration[];
    registeredCount?: number;
    loading?: boolean;
    onHeartbeat?: (id: string) => void;
    onRevoke?: (id: string) => void;
    onTroubleshootGateway?: () => void;
    onProvisionEdgeAgent?: () => void;
    onViewAllDevices?: () => void;
}

export function ConnectedDevicesPanel({
    status = "STANDBY",
    devices = [],
    registeredCount = 0,
    loading = false,
    onHeartbeat,
    onRevoke,
    onTroubleshootGateway,
    onProvisionEdgeAgent,
    onViewAllDevices,
}: ConnectedDevicesPanelProps) {
    const isOnline = (item: DeviceRegistration) => item.connectionStatus === "online";

    return (
        <ChamferCard size="lg" className="min-h-[365px]">
            <div className="p-5 flex flex-col h-full w-full">
                <div className="flex items-center justify-between pb-3 pl-2 border-b border-[#f1f5f9] w-full">
                    <h2 className="text-[12px] font-bold uppercase text-[#1e293b] tracking-[0.6px] leading-4">
                        CONNECTED DEVICES
                    </h2>

                    <div className="flex items-center gap-1.5 pr-2">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                devices.length > 0 ? "bg-[#10b981]" : "bg-[#cbd5e1]"
                            }`}
                        />
                        <span className="font-mono text-[11px] text-[#94a3b8] leading-4">
                            {status}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 flex-1 w-full">
                        <Loader2 className="w-8 h-8 text-[var(--color-border-dark)] animate-spin mb-3" />
                        <p className="text-[13px] text-[#64748b]">Loading connected devices...</p>
                    </div>
                ) : devices.length === 0 ? (
                    <EmptyState
                        icon={WifiOff}
                        title="No Connected Devices"
                        description={
                            registeredCount > 0
                                ? `All ${registeredCount} registered devices are currently offline / in standby. No live telemetry broadcast in the last 30s.`
                                : "There are no ground or airborne devices broadcasting telemetry to the central gateway right now."
                        }
                    >
                        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                            {onViewAllDevices && registeredCount > 0 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={onViewAllDevices}
                                        className="text-xs font-bold text-cyan-600 hover:text-cyan-700 underline cursor-pointer"
                                    >
                                        View All Registered Devices ({registeredCount})
                                    </button>
                                    <span className="text-[16px] text-[#cbd5e1]">•</span>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={onTroubleshootGateway}
                                className="text-xs font-bold text-[var(--color-border-dark)] hover:text-[var(--color-text-primary)] underline cursor-pointer"
                            >
                                Troubleshoot Gateway
                            </button>
                            <span className="text-[16px] text-[#cbd5e1]">•</span>
                            <button
                                type="button"
                                onClick={onProvisionEdgeAgent}
                                className="text-xs font-bold text-[var(--color-border-dark)] hover:text-[var(--color-text-primary)] underline cursor-pointer"
                            >
                                Provision Edge Agent
                            </button>
                        </div>
                    </EmptyState>
                ) : (
                    <div className="w-full overflow-x-auto pt-2">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200 bg-slate-50/50">
                                        Device Identifier
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200 bg-slate-50/50">
                                        Drone ID / Model
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200 bg-slate-50/50">
                                        Status
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200 bg-slate-50/50">
                                        Socket ID
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200 bg-slate-50/50">
                                        Last Seen
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider py-3 px-4 border-b border-slate-200 bg-slate-50/50 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map((device) => (
                                    <tr
                                        key={device.id}
                                        className="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                                    >
                                        <td className="py-3 px-4 text-xs font-mono font-bold text-slate-900">
                                            {device.deviceIdentifier}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-700">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-800">
                                                    {device.droneRegistrationNumber ||
                                                        device.droneId?.substring(0, 8) ||
                                                        "—"}
                                                </span>
                                                {device.droneModel && (
                                                    <span className="text-[11px] text-slate-400">
                                                        {device.droneModel}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-700">
                                            <StatusBadge
                                                status={
                                                    isOnline(device)
                                                        ? "online"
                                                        : device.connectionStatus || "offline"
                                                }
                                                label={(
                                                    device.connectionStatus || "offline"
                                                ).toUpperCase()}
                                            />
                                        </td>
                                        <td className="py-3 px-4 text-xs font-mono text-[11px] text-slate-500">
                                            {device.socketId || "—"}
                                        </td>
                                        <td className="py-3 px-4 text-[12px] text-slate-500">
                                            {device.lastSeenAt
                                                ? formatRelativeTime(device.lastSeenAt)
                                                : "Never"}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-700 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => onHeartbeat?.(device.id)}
                                                    title="Ping Heartbeat"
                                                    className="btn-icon"
                                                >
                                                    <Activity className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onRevoke?.(device.id)}
                                                    title="Revoke Device"
                                                    className="btn-icon-danger"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}

export default ConnectedDevicesPanel;
