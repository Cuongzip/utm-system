"use client";

import { useMemo } from "react";
import { ChamferCard } from "@/components/ui";

export const API_HEALTH_STATUSES = {
    LOADING: "loading",
    ERROR: "error",
    DEGRADED: "degraded",
    CONNECTED: "connected",
} as const;

export type ApiHealthStatus = (typeof API_HEALTH_STATUSES)[keyof typeof API_HEALTH_STATUSES];

export interface DashboardDiagnosticsProps {
    hubsOnline: number;
    totalHubs: number;
    fleetSize: number;
    conflictsCount: number;
    apiStatus?: ApiHealthStatus;
    isSocketConnected?: boolean;
    activeTelemetryCount?: number;
    connectedDevicesCount?: number;
}

interface HealthConfig {
    textClass: string;
    apiLabel: string;
    dotClass: string;
}

const HEALTH_CONFIG_MAP: Record<ApiHealthStatus, HealthConfig> = {
    [API_HEALTH_STATUSES.LOADING]: {
        textClass: "text-amber-500 font-bold animate-pulse",
        apiLabel: "SYNCING...",
        dotClass: "bg-amber-500",
    },
    [API_HEALTH_STATUSES.ERROR]: {
        textClass: "text-rose-600 font-bold",
        apiLabel: "OFFLINE",
        dotClass: "bg-rose-500",
    },
    [API_HEALTH_STATUSES.DEGRADED]: {
        textClass: "text-amber-600 font-bold",
        apiLabel: "PARTIAL",
        dotClass: "bg-amber-500",
    },
    [API_HEALTH_STATUSES.CONNECTED]: {
        textClass: "text-emerald-600 font-bold",
        apiLabel: "CONNECTED",
        dotClass: "bg-emerald-500",
    },
};

export function DashboardDiagnostics({
    hubsOnline,
    totalHubs,
    fleetSize,
    conflictsCount,
    apiStatus = API_HEALTH_STATUSES.CONNECTED,
    isSocketConnected = false,
    activeTelemetryCount = 0,
    connectedDevicesCount = 0,
}: DashboardDiagnosticsProps) {
    const isThreatElevated = conflictsCount > 0;

    const health = useMemo(() => HEALTH_CONFIG_MAP[apiStatus], [apiStatus]);

    return (
        <ChamferCard size="lg" className="h-full min-h-[340px]">
            <div className="p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
                        <div className="flex items-center space-x-2 text-xs font-bold text-[var(--color-text-primary)] font-mono tracking-wider">
                            <span
                                className={`w-2 h-2 rounded-full ${health.dotClass} animate-pulse`}
                            />
                            <span>SYSTEM DIAGNOSTICS</span>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)] font-medium">
                                API BACKEND
                            </span>
                            <span className="border-b border-dotted border-[var(--color-border-default)] flex-1 mx-3" />
                            <span className={health.textClass}>{health.apiLabel}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)] font-medium">
                                HUBS ONLINE
                            </span>
                            <span className="border-b border-dotted border-[var(--color-border-default)] flex-1 mx-3" />
                            <span className="text-[var(--color-text-primary)] font-bold">
                                {hubsOnline} / {totalHubs}
                                {totalHubs > 0
                                    ? ` (${Math.round((hubsOnline / totalHubs) * 100)}%)`
                                    : ""}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)] font-medium">
                                FLEET SIZE
                            </span>
                            <span className="border-b border-dotted border-[var(--color-border-default)] flex-1 mx-3" />
                            <span className="text-[var(--color-text-primary)] font-bold">
                                {fleetSize} UNITS
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)] font-medium">
                                THREAT LEVEL
                            </span>
                            <span className="border-b border-dotted border-[var(--color-border-default)] flex-1 mx-3" />
                            <span
                                className={`font-bold ${
                                    isThreatElevated ? "text-rose-600" : "text-emerald-600"
                                }`}
                            >
                                {isThreatElevated ? `${conflictsCount} ACTIVE ALERTS` : "NOMINAL"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)] font-medium">
                                TELEMETRY LINK
                            </span>
                            <span className="border-b border-dotted border-[var(--color-border-default)] flex-1 mx-3" />
                            <span className="text-[var(--color-text-secondary)] font-semibold">
                                {activeTelemetryCount > 0 ? (
                                    <span className="text-emerald-600 font-bold">
                                        {activeTelemetryCount} STREAMING SIGNALS
                                    </span>
                                ) : isSocketConnected ? (
                                    <span className="text-cyan-600 font-semibold">
                                        STANDBY (STOMP READY)
                                    </span>
                                ) : (
                                    <span className="text-[var(--color-text-muted)] font-semibold">
                                        POLLING FALLBACK
                                    </span>
                                )}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)] font-medium">
                                IOT DEVICES
                            </span>
                            <span className="border-b border-dotted border-[var(--color-border-default)] flex-1 mx-3" />
                            <span className="text-[var(--color-text-secondary)] font-semibold">
                                {connectedDevicesCount > 0 ? (
                                    <span className="text-emerald-600 font-semibold">
                                        {connectedDevicesCount} REGISTERED
                                    </span>
                                ) : (
                                    <span className="text-[var(--color-text-muted)]">
                                        0 DEVICES
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}
