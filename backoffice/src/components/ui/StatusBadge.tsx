"use client";

import { cn } from "@/lib";

export type StatusType =
    | "online"
    | "offline"
    | "connecting"
    | "alert"
    | "active"
    | "available"
    | "idle"
    | "in_flight"
    | "in flight"
    | "charging"
    | "maintenance"
    | "inactive"
    | "critical"
    | "high"
    | "medium"
    | "low"
    | "ok"
    | "no_fly_zone"
    | string;

export type DotShape = "diamond" | "circle";

export interface StatusBadgeProps {
    status: StatusType;
    label?: string;
    showDot?: boolean;
    dotShape?: DotShape;
    className?: string;
}

const DOT_COLOR_MAP: Record<string, string> = {
    online: "bg-emerald-600",
    live: "bg-emerald-600",
    active: "bg-emerald-600",
    running: "bg-emerald-600",
    available: "bg-emerald-600",
    conforming: "bg-emerald-600",
    approved: "bg-emerald-600",
    completed: "bg-emerald-600",
    success: "bg-emerald-600",
    resolved: "bg-emerald-600",
    ok: "bg-emerald-600",
    nominal: "bg-emerald-600",
    go: "bg-emerald-600",

    alert: "bg-red-600",
    error: "bg-red-600",
    failed: "bg-red-600",
    aborted: "bg-red-600",
    non_conforming: "bg-red-600",
    cancelled: "bg-red-600",
    no_fly_zone: "bg-red-600",
    nfz: "bg-red-600",
    critical: "bg-red-600",
    emergency: "bg-red-600",
    emergency_landing: "bg-red-600",
    diverted: "bg-red-600",
    no_go: "bg-red-600",
    battery_drain: "bg-red-600",
    gps_failure: "bg-red-600",
    c2_lost: "bg-red-600",
    motor_failure: "bg-red-600",
    geofence_breach: "bg-red-600",

    warning: "bg-amber-500",
    restricted: "bg-amber-500",
    high: "bg-amber-500",
    medium: "bg-amber-500",
    paused: "bg-amber-500",
    elevated: "bg-amber-500",
    marginal: "bg-amber-500",

    connecting: "bg-amber-500",
    charging: "bg-amber-500",
    maintenance: "bg-amber-500",
    syncing: "bg-amber-500",

    in_flight: "bg-cyan-500 animate-pulse",
    "in flight": "bg-cyan-500 animate-pulse",
    airborne: "bg-cyan-500 animate-pulse",

    scheduled: "bg-indigo-500",
    planned: "bg-indigo-500",
    standby: "bg-indigo-500",
    authorized: "bg-indigo-500",
    corridor_transit: "bg-indigo-500",

    offline: "bg-slate-400",
    inactive: "bg-slate-400",
    idle: "bg-slate-400",
    draft: "bg-slate-400",
    stopped: "bg-slate-400",
    low: "bg-slate-400",
    info: "bg-slate-400",
};

export function StatusBadge({
    status,
    label,
    showDot = true,
    dotShape = "diamond",
    className,
}: StatusBadgeProps) {
    const normalized = (status || "").toLowerCase().replace(/[-\s]/g, "_");
    const displayLabel = label !== undefined ? label : (status || "UNKNOWN").toUpperCase();

    const dotShapeClass =
        dotShape === "diamond" ? "rounded-[1px] rotate-45" : "rounded-full rotate-0";
    const dotColorClass = DOT_COLOR_MAP[normalized] || "bg-slate-400";

    return (
        <span
            className={cn(
                "relative inline-flex items-center gap-1.5 p-0 text-[11px] font-bold font-mono uppercase leading-tight whitespace-nowrap tracking-wider bg-transparent border-none text-[var(--color-text-primary)]",
                className
            )}
        >
            {showDot && (
                <span
                    className={cn(
                        "w-1.5 h-1.5 shrink-0 inline-block",
                        dotShapeClass,
                        dotColorClass
                    )}
                />
            )}
            <span>{displayLabel}</span>
        </span>
    );
}
