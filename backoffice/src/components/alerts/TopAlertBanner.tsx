"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { ChamferButton, StatusBadge } from "@/components/ui";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
import { formatRelativeTime } from "@/utils";
import { LIVE_ALERT_SEVERITY, type LiveAlertSeverity } from "@/types";

function getSeverityBadge(severity: LiveAlertSeverity): { status: string; label: string } {
    switch (severity) {
        case LIVE_ALERT_SEVERITY.EMERGENCY:
            return { status: "emergency", label: "EMERGENCY" };
        case LIVE_ALERT_SEVERITY.CRITICAL:
            return { status: "critical", label: "CRITICAL" };
        case LIVE_ALERT_SEVERITY.HIGH:
        case LIVE_ALERT_SEVERITY.WARNING:
            return { status: "warning", label: "WARNING" };
        case LIVE_ALERT_SEVERITY.MEDIUM:
        case LIVE_ALERT_SEVERITY.LOW:
        case LIVE_ALERT_SEVERITY.INFO:
        default:
            return { status: "info", label: "ADVISORY" };
    }
}

function cleanBannerMessage(raw: string): string {
    return raw
        .replace(
            /^AUTO FAILSAFE:\s*([A-Z0-9_-]+)\s+executing for\s+[a-z0-9_]+\.\s*/i,
            "Auto failsafe ($1) · "
        )
        .replace(/\b([a-z]+)_([a-z0-9_]+)\b/g, (match) => match.replace(/_/g, " "));
}

export function TopAlertBanner() {
    const { activeAlert, currentIndex, totalCount, prevAlert, nextAlert, dismissAlert } =
        useLiveAlerts();

    if (totalCount === 0 || !activeAlert) {
        return null;
    }

    const badge = getSeverityBadge(activeAlert.severity);
    const displayMessage = cleanBannerMessage(activeAlert.message);

    return (
        <div
            role="region"
            aria-label="Live system alert"
            className="sticky top-0 z-30 w-full shrink-0 select-none bg-[var(--color-surface-panel)]/95 backdrop-blur-sm border-b border-[var(--color-border-default)]"
        >
            <div className="w-full px-4 sm:px-6 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <StatusBadge status={badge.status} label={badge.label} />

                    <span
                        className="text-xs text-[var(--color-text-primary)] font-medium truncate"
                        title={activeAlert.message}
                    >
                        {displayMessage}
                    </span>

                    <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0 hidden md:inline">
                        · {formatRelativeTime(activeAlert.timestamp)}
                    </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {totalCount > 1 && (
                        <div className="inline-flex items-center h-7 rounded-[4px] border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-[11px] font-mono text-[var(--color-text-secondary)]">
                            <button
                                type="button"
                                onClick={prevAlert}
                                aria-label="Previous alert"
                                className="w-6 h-full inline-flex items-center justify-center hover:text-[var(--color-text-primary)] hover:bg-slate-200/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <span className="px-1.5 tabular-nums border-x border-[var(--color-border-default)] leading-none">
                                {currentIndex + 1}/{totalCount}
                            </span>
                            <button
                                type="button"
                                onClick={nextAlert}
                                aria-label="Next alert"
                                className="w-6 h-full inline-flex items-center justify-center hover:text-[var(--color-text-primary)] hover:bg-slate-200/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                        </div>
                    )}

                    <ChamferButton
                        variant="outline"
                        size="xs"
                        clip="xs"
                        href={activeAlert.actionUrl}
                        innerClassName="font-mono uppercase tracking-wider text-[11px]"
                    >
                        {activeAlert.actionLabel}
                    </ChamferButton>

                    <button
                        type="button"
                        onClick={() => dismissAlert(activeAlert.id)}
                        className="w-7 h-7 rounded-[4px] border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-card)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        title="Dismiss alert"
                        aria-label="Dismiss alert"
                    >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
}
