"use client";

import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
import { formatRelativeTime } from "@/utils";
import { LIVE_ALERT_SEVERITY, type LiveAlertSeverity } from "@/types";

function getSeverityConfig(severity: LiveAlertSeverity) {
    switch (severity) {
        case LIVE_ALERT_SEVERITY.EMERGENCY:
        case LIVE_ALERT_SEVERITY.CRITICAL:
            return {
                accentClass: "border-l-red-500",
                badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
                iconClass: "text-red-400",
                label: severity === LIVE_ALERT_SEVERITY.EMERGENCY ? "EMERGENCY" : "CRITICAL",
                Icon: AlertTriangle,
            };
        case LIVE_ALERT_SEVERITY.HIGH:
        case LIVE_ALERT_SEVERITY.WARNING:
            return {
                accentClass: "border-l-amber-400",
                badgeClass: "bg-amber-400/20 text-amber-200 border-amber-400/40",
                iconClass: "text-amber-400",
                label: "WARNING",
                Icon: AlertTriangle,
            };
        case LIVE_ALERT_SEVERITY.MEDIUM:
        case LIVE_ALERT_SEVERITY.LOW:
        case LIVE_ALERT_SEVERITY.INFO:
        default:
            return {
                accentClass: "border-l-cyan-400",
                badgeClass: "bg-cyan-400/15 text-cyan-200 border-cyan-400/35",
                iconClass: "text-cyan-400",
                label: "ADVISORY",
                Icon: Info,
            };
    }
}

export function TopAlertBanner() {
    const { activeAlert, currentIndex, totalCount, prevAlert, nextAlert, dismissAlert } =
        useLiveAlerts();

    if (totalCount === 0 || !activeAlert) {
        return null;
    }

    const config = getSeverityConfig(activeAlert.severity);
    const { Icon } = config;

    return (
        <div
            role="region"
            aria-label="Live system alert"
            className="sticky top-0 z-30 w-full select-none font-sans"
        >
            <div
                className={`w-full px-3 sm:px-6 py-2 bg-slate-900 text-slate-100 border-b border-slate-800 border-l-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 ${config.accentClass}`}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Icon className={`w-4 h-4 shrink-0 ${config.iconClass}`} aria-hidden="true" />

                    <span
                        className={`px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 ${config.badgeClass}`}
                    >
                        {config.label}
                    </span>

                    <span className="text-xs text-slate-100 font-medium truncate">
                        {activeAlert.message}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline">
                        · {formatRelativeTime(activeAlert.timestamp)}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {totalCount > 1 && (
                        <div className="inline-flex items-center rounded border border-slate-700 bg-slate-800/80 text-[11px] font-mono text-slate-300">
                            <button
                                type="button"
                                onClick={prevAlert}
                                aria-label="Previous alert"
                                className="p-1 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <span className="px-1.5 tabular-nums">
                                {currentIndex + 1}/{totalCount}
                            </span>
                            <button
                                type="button"
                                onClick={nextAlert}
                                aria-label="Next alert"
                                className="p-1 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    <Link
                        href={activeAlert.actionUrl}
                        className="px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-900 bg-slate-100 hover:bg-white rounded transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        {activeAlert.actionLabel}
                    </Link>

                    <button
                        type="button"
                        onClick={() => dismissAlert(activeAlert.id)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        title="Dismiss alert"
                        aria-label="Dismiss alert"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
}
