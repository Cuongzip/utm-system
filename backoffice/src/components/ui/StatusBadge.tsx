"use client";

import { useLocale } from "next-intl";
import { cn } from "@/lib";
import { translateStatusLabel, type AppLocale } from "@/i18n";

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
    tone?: "light" | "dark";
    className?: string;
}

const DOT_COLOR_MAP: Record<string, string> = {
    online: "bg-emerald-600",
    live: "bg-emerald-600",
    active: "bg-emerald-600",
    running: "bg-emerald-600",
    available: "bg-emerald-600",
    conforming: "bg-emerald-600",
    conformant: "bg-emerald-600",
    approved: "bg-emerald-600",
    completed: "bg-emerald-600",
    success: "bg-emerald-600",
    resolved: "bg-emerald-600",
    ok: "bg-emerald-600",
    nominal: "bg-emerald-600",
    go: "bg-emerald-600",
    green: "bg-emerald-600",
    approve: "bg-emerald-600",
    vfr: "bg-emerald-600",
    safe: "bg-emerald-600",
    optimal: "bg-emerald-600",
    acceptable: "bg-emerald-600",

    alert: "bg-red-600",
    red: "bg-red-600",
    deny: "bg-red-600",
    error: "bg-red-600",
    failed: "bg-red-600",
    aborted: "bg-red-600",
    non_conforming: "bg-red-600",
    cancelled: "bg-red-600",
    no_fly_zone: "bg-red-600",
    nfz: "bg-red-600",
    prohibited: "bg-red-600",
    critical: "bg-red-600",
    emergency: "bg-red-600",
    emergency_landing: "bg-red-600",
    diverted: "bg-red-600",
    no_go: "bg-red-600",
    unsafe: "bg-red-600",
    severe: "bg-red-600",
    lifr: "bg-red-600",
    ifr: "bg-red-600",
    detected: "bg-red-600",
    escalated: "bg-red-600",
    battery_drain: "bg-red-600",
    gps_failure: "bg-red-600",
    c2_lost: "bg-red-600",
    motor_failure: "bg-red-600",
    geofence_breach: "bg-red-600",
    revoked: "bg-red-600",

    warning: "bg-amber-500",
    amber: "bg-amber-500",
    yellow: "bg-amber-500",
    caution: "bg-amber-500",
    go_with_conditions: "bg-amber-500",
    approve_with_conditions: "bg-amber-500",
    mvfr: "bg-amber-500",
    moderate: "bg-amber-500",
    suspended: "bg-amber-500",
    contingent: "bg-amber-500",
    restricted: "bg-amber-500",
    high: "bg-amber-500",
    medium: "bg-amber-500",
    paused: "bg-amber-500",
    elevated: "bg-amber-500",
    marginal: "bg-amber-500",
    notified: "bg-amber-500",
    resolving: "bg-amber-500",
    pending_confirmation: "bg-amber-500 animate-pulse",

    connecting: "bg-amber-500",
    charging: "bg-indigo-500",
    maintenance: "bg-amber-500",
    syncing: "bg-amber-500",

    in_flight: "bg-sky-600 animate-pulse",
    "in flight": "bg-sky-600 animate-pulse",
    airborne: "bg-sky-600 animate-pulse",
    executing: "bg-emerald-600 animate-pulse",
    in_progress: "bg-emerald-600 animate-pulse",

    scheduled: "bg-slate-500",
    planned: "bg-slate-500",
    pending: "bg-slate-400",
    standby: "bg-slate-500",
    authorized: "bg-sky-600",
    ready: "bg-sky-600",
    corridor_transit: "bg-slate-500",
    acknowledged: "bg-slate-500",
    hub_corridor: "bg-slate-600",

    offline: "bg-slate-400",
    inactive: "bg-slate-400",
    idle: "bg-slate-400",
    draft: "bg-slate-400",
    stopped: "bg-slate-400",
    dismissed: "bg-slate-400",
    rejected: "bg-slate-400",
    retired: "bg-slate-400",
    low: "bg-slate-400",
    info: "bg-slate-400",
};

export function StatusBadge({
    status,
    label,
    showDot = true,
    dotShape = "diamond",
    tone = "light",
    className,
}: StatusBadgeProps) {
    const locale = useLocale() as AppLocale;
    const normalized = (status || "").toLowerCase().replace(/[-\s]/g, "_");
    const displayLabel =
        label !== undefined
            ? label
            : (translateStatusLabel(status, locale) ??
              (status || "UNKNOWN").replace(/_/g, " ").toUpperCase());

    const dotShapeClass =
        dotShape === "diamond" ? "rounded-[1px] rotate-45" : "rounded-full rotate-0";
    const dotColorClass = DOT_COLOR_MAP[normalized] || "bg-slate-400";

    return (
        <span
            className={cn(
                "relative inline-flex items-center gap-1.5 p-0 text-[11px] font-bold font-mono uppercase leading-tight whitespace-nowrap tracking-wider bg-transparent border-none",
                tone === "dark" ? "text-slate-100" : "text-[var(--color-text-primary)]",
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
            {displayLabel !== "" && <span>{displayLabel}</span>}
        </span>
    );
}
