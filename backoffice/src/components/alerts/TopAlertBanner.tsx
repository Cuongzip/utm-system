"use client";

import Link from "next/link";
import { AlertTriangle, Info, X } from "lucide-react";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
import type { LiveAlertSeverity } from "@/types";

function formatRelativeTime(timestamp: string): string {
    try {
        const time = new Date(timestamp).getTime();
        if (isNaN(time)) return "just now";
        const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
        if (diffSeconds < 10) return "just now";
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 30) return `${diffDays}d ago`;
        const diffMonths = Math.floor(diffDays / 30);
        if (diffMonths === 1) return "about 1 month ago";
        if (diffMonths < 12) return `about ${diffMonths} months ago`;
        const diffYears = Math.floor(diffMonths / 12);
        return diffYears === 1 ? "about 1 year ago" : `about ${diffYears} years ago`;
    } catch {
        return "just now";
    }
}

function getSeverityConfig(severity: LiveAlertSeverity) {
    switch (severity) {
        case "EMERGENCY":
        case "CRITICAL":
            return {
                containerClass: "bg-[#fee2e2] border-b border-[#fecaca] text-slate-800",
                iconClass: "text-red-600",
                labelClass: "text-red-700 font-bold",
                label: severity === "EMERGENCY" ? "EMERGENCY" : "CRITICAL",
                Icon: AlertTriangle,
            };
        case "HIGH":
        case "WARNING":
            return {
                containerClass: "bg-[#fef3c7] border-b border-[#fde68a] text-slate-800",
                iconClass: "text-amber-500",
                labelClass: "text-amber-600 font-bold",
                label: "WARNING",
                Icon: AlertTriangle,
            };
        case "MEDIUM":
        case "LOW":
        case "INFO":
        default:
            return {
                containerClass: "bg-[#e0f2fe] border-b border-[#bae6fd] text-slate-800",
                iconClass: "text-sky-500",
                labelClass: "text-sky-600 font-bold",
                label: "INFO",
                Icon: Info,
            };
    }
}

export function TopAlertBanner() {
    const { activeAlert, totalCount, dismissAlert } = useLiveAlerts();

    if (totalCount === 0 || !activeAlert) {
        return null;
    }

    const config = getSeverityConfig(activeAlert.severity);
    const { Icon } = config;
    const moreCount = totalCount - 1;

    return (
        <div className="sticky top-0 z-40 w-full select-none font-sans">
            <div
                className={`w-full px-4 sm:px-6 py-2.5 transition-all duration-200 flex items-center justify-between gap-4 ${config.containerClass}`}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                    <Icon className={`w-4 h-4 shrink-0 ${config.iconClass}`} />

                    <span
                        className={`text-xs uppercase tracking-wide shrink-0 ${config.labelClass}`}
                    >
                        {config.label}
                    </span>

                    <span className="text-slate-400 font-light select-none">|</span>

                    <span className="text-xs sm:text-sm text-slate-800 font-medium truncate">
                        {activeAlert.message}
                    </span>

                    <span className="text-xs text-slate-500 font-normal shrink-0">
                        ({formatRelativeTime(activeAlert.timestamp)})
                    </span>

                    {moreCount > 0 && (
                        <span className="text-xs text-slate-500 font-normal shrink-0">
                            (+{moreCount} more)
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <Link
                        href={activeAlert.actionUrl}
                        className="px-3.5 py-1 text-xs font-medium text-slate-800 bg-white/90 hover:bg-white rounded border border-slate-300/80 shadow-sm transition-all hover:border-slate-400"
                    >
                        View Details
                    </Link>

                    <button
                        onClick={() => dismissAlert(activeAlert.id)}
                        className="p-1 text-slate-500 hover:text-slate-800 rounded transition-colors cursor-pointer"
                        title="Dismiss alert"
                        aria-label="Dismiss alert"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
