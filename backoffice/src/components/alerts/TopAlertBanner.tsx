"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, ChevronUp, Loader2 } from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";
import { useLiveAlerts } from "@/hooks";
import { cn } from "@/lib";
import { formatRelativeTime } from "@/utils";
import { getAlertSeverityStatus, getAlertSeverityTier, IS_COCKPIT_PATH_RE } from "./alertUtils";

export function TopAlertBanner() {
    const t = useTranslations("alerts");
    const pathname = usePathname();
    const {
        activeAlert,
        currentIndex,
        totalCount,
        isOverlayVisible,
        acknowledgingId,
        prevAlert,
        nextAlert,
        minimizeOverlay,
        setOverlayInteracting,
        openDrawer,
        acknowledgeAlert,
    } = useLiveAlerts();

    if (!isOverlayVisible || !activeAlert) {
        return null;
    }

    const isCockpit = Boolean(pathname && IS_COCKPIT_PATH_RE.test(pathname));
    const severityStatus = getAlertSeverityStatus(activeAlert.severity, activeAlert.status);
    const severityTier = getAlertSeverityTier(activeAlert);
    const isAcknowledging = acknowledgingId === activeAlert.id;

    const actionLabelMap: Record<string, string> = {
        "View Flight": t("viewFlight"),
        "View Drone": t("viewDrone"),
        "View Conflicts": t("viewConflicts"),
        "Confirm Action": t("confirmAction"),
        "Manage Incident": t("manageIncident"),
    };
    const localizedActionLabel = actionLabelMap[activeAlert.actionLabel] ?? activeAlert.actionLabel;

    return (
        <div
            className={cn(
                "pointer-events-none absolute inset-x-0 z-40 flex justify-center px-3 sm:px-6",
                isCockpit ? "top-14" : "top-3"
            )}
        >
            <div
                role="region"
                aria-label={t("liveSystemAlert")}
                aria-live={severityTier === "critical" ? "assertive" : "polite"}
                onMouseEnter={() => setOverlayInteracting(true)}
                onMouseLeave={() => setOverlayInteracting(false)}
                onFocus={() => setOverlayInteracting(true)}
                onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                        setOverlayInteracting(false);
                    }
                }}
                className="pointer-events-auto w-fit max-w-full sm:max-w-[min(56rem,100%)] select-none drop-shadow-[0_10px_24px_rgba(15,23,42,0.28)]"
            >
                <ChamferCard
                    size="sm"
                    className="bg-slate-600/80"
                    innerClassName="bg-slate-800/95 backdrop-blur-md text-slate-100 flex-row flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 px-3.5 sm:px-4 py-2"
                >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <StatusBadge
                            status={severityStatus}
                            tone="dark"
                            dotShape="circle"
                            className="shrink-0 text-white tracking-wider"
                        />

                        <span
                            className="text-xs sm:text-[13px] font-semibold text-white truncate max-w-[16rem] sm:max-w-[24rem] lg:max-w-[30rem]"
                            title={activeAlert.message}
                        >
                            {activeAlert.message}
                        </span>

                        <span className="text-xs text-slate-400 shrink-0 hidden md:inline whitespace-nowrap">
                            · {formatRelativeTime(activeAlert.timestamp)}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
                        {totalCount > 1 && (
                            <div className="inline-flex items-center h-7 rounded-[4px] border border-slate-600/80 bg-slate-900/40 text-[11px] font-mono text-slate-200">
                                <button
                                    type="button"
                                    onClick={prevAlert}
                                    aria-label={t("previousAlert")}
                                    className="w-6 h-full inline-flex items-center justify-center hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={openDrawer}
                                    title={t("openAlertCenter")}
                                    aria-label={t("openAlertCenterWithCount", {
                                        count: totalCount,
                                    })}
                                    className="px-2 h-full tabular-nums border-x border-slate-600/80 hover:bg-slate-700/80 hover:text-white transition-colors cursor-pointer leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    {currentIndex + 1}/{totalCount}
                                </button>
                                <button
                                    type="button"
                                    onClick={nextAlert}
                                    aria-label={t("nextAlert")}
                                    className="w-6 h-full inline-flex items-center justify-center hover:text-white hover:bg-slate-700/80 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        <Link
                            href={activeAlert.actionUrl}
                            className="h-7 px-3 rounded-[4px] border border-slate-500/80 bg-slate-900/25 hover:bg-slate-700/80 hover:border-slate-400 active:bg-slate-700 text-white font-mono font-bold uppercase tracking-wider text-[11px] inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 no-underline whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                        >
                            {localizedActionLabel}
                        </Link>

                        {activeAlert.source === "alert" && (
                            <button
                                type="button"
                                disabled={isAcknowledging}
                                onClick={() => acknowledgeAlert(activeAlert.id)}
                                title={t("acknowledgeAlert")}
                                aria-label={t("acknowledgeAlert")}
                                className="w-7 h-7 rounded-[4px] border border-slate-600/80 bg-slate-900/25 text-slate-300 hover:bg-emerald-600/25 hover:border-emerald-500/60 hover:text-emerald-200 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                {isAcknowledging ? (
                                    <Loader2
                                        className="w-3.5 h-3.5 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={minimizeOverlay}
                            title={t("minimizeAlert")}
                            aria-label={t("minimizeAlert")}
                            className="w-7 h-7 rounded-[4px] border border-slate-600/80 bg-slate-900/25 text-slate-300 hover:bg-slate-700/80 hover:text-white hover:border-slate-500 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                    </div>
                </ChamferCard>
            </div>
        </div>
    );
}
