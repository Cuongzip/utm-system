"use client";

import { ChamferCard, StatusBadge } from "@/components/ui";

export interface DashboardDiagnosticsProps {
    hubsOnline: number;
    totalHubs: number;
    fleetSize: number;
    conflictsCount: number;
    apiStatus?: "connected" | "degraded" | "error" | "loading";
    isSocketConnected?: boolean;
    activeTelemetryCount?: number;
    connectedDevicesCount?: number;
    lastSyncedTime?: string;
}

export function DashboardDiagnostics({
    hubsOnline,
    totalHubs,
    fleetSize,
    conflictsCount,
    apiStatus = "connected",
    isSocketConnected = false,
    activeTelemetryCount = 0,
    connectedDevicesCount = 0,
    lastSyncedTime = "--",
}: DashboardDiagnosticsProps) {
    const isThreatElevated = conflictsCount > 0;

    const badgeConfig = {
        error: { status: "emergency", label: "OFFLINE" },
        degraded: { status: "warning", label: "DEGRADED" },
        loading: { status: "active", label: "SYNCING..." },
        connected: isThreatElevated
            ? { status: "warning", label: "ELEVATED" }
            : { status: "online", label: "HEALTHY" },
    }[apiStatus];

    const apiTextClass = {
        loading: "text-amber-500 font-bold animate-pulse",
        error: "text-rose-600 font-bold",
        degraded: "text-amber-600 font-bold",
        connected: "text-emerald-600 font-bold",
    }[apiStatus];

    const apiLabel = {
        loading: "SYNCING...",
        error: "OFFLINE",
        degraded: "PARTIAL",
        connected: "CONNECTED",
    }[apiStatus];

    return (
        <ChamferCard size="lg" className="h-full min-h-[340px]">
            <div className="p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                            <span
                                className={`w-2 h-2 rounded-full ${
                                    apiStatus === "error"
                                        ? "bg-rose-500"
                                        : isThreatElevated
                                          ? "bg-amber-500"
                                          : "bg-emerald-500"
                                } animate-pulse`}
                            />
                            <span>SYSTEM DIAGNOSTICS</span>
                        </div>
                        {badgeConfig && (
                            <StatusBadge
                                status={badgeConfig.status as any}
                                label={badgeConfig.label}
                                shape="rounded"
                            />
                        )}
                    </div>

                    <div className="mt-4 space-y-3.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">API BACKEND</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className={apiTextClass}>{apiLabel}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">HUBS ONLINE</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-slate-800 font-bold">
                                {hubsOnline} / {totalHubs}
                                {totalHubs > 0
                                    ? ` (${Math.round((hubsOnline / totalHubs) * 100)}%)`
                                    : ""}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">FLEET SIZE</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-slate-800 font-bold">{fleetSize} UNITS</span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">THREAT LEVEL</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span
                                className={`font-bold ${
                                    isThreatElevated ? "text-rose-600" : "text-emerald-600"
                                }`}
                            >
                                {isThreatElevated ? `${conflictsCount} ACTIVE ALERTS` : "NOMINAL"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">TELEMETRY LINK</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-slate-700 font-semibold">
                                {activeTelemetryCount > 0 ? (
                                    <span className="text-emerald-600 font-bold">
                                        {activeTelemetryCount} STREAMING SIGNALS
                                    </span>
                                ) : isSocketConnected ? (
                                    <span className="text-cyan-600 font-semibold">
                                        STANDBY (STOMP READY)
                                    </span>
                                ) : (
                                    <span className="text-slate-500 font-semibold">
                                        POLLING FALLBACK
                                    </span>
                                )}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">IOT DEVICES</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-slate-700 font-semibold">
                                {connectedDevicesCount > 0 ? (
                                    <span className="text-emerald-600 font-semibold">
                                        {connectedDevicesCount} REGISTERED
                                    </span>
                                ) : (
                                    <span className="text-slate-400">0 DEVICES</span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                        SOCKET:{" "}
                        <strong
                            className={isSocketConnected ? "text-emerald-600" : "text-amber-600"}
                        >
                            {isSocketConnected ? "STOMP SYNCED" : "RECONNECTING"}
                        </strong>
                    </span>
                    <span>LAST SYNC: {lastSyncedTime}</span>
                </div>
            </div>
        </ChamferCard>
    );
}

export default DashboardDiagnostics;
