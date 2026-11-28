"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import {
    ArrowRight,
    BellRing,
    Check,
    Drone,
    Eye,
    EyeOff,
    Loader2,
    PlaneTakeoff,
    ShieldCheck,
    Siren,
    X,
} from "lucide-react";
import {
    ChamferButton,
    EmptyState,
    SideDrawer,
    StatusBadge,
    type SideDrawerTabItem,
} from "@/components/ui";
import { useLiveAlerts } from "@/hooks";
import { cn } from "@/lib";
import { formatRelativeTime } from "@/utils";
import type { AppLocale } from "@/i18n";
import { INCIDENT_STATUS, LIVE_ALERT_SEVERITY } from "@/types";
import {
    formatAlertTypeLabel,
    getAlertSeverityStatus,
    getAlertSeverityTier,
    resolveAlertEntities,
    type AlertSeverityTier,
} from "./alertUtils";

type FilterKey = "all" | AlertSeverityTier;

export function AlertCenterDrawer() {
    const t = useTranslations("alerts");
    const tc = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const {
        alerts,
        totalCount,
        highestTier,
        tierCounts,
        entityMap,
        isOverlayMinimized,
        isDrawerOpen,
        acknowledgingId,
        alertConnected,
        emergencyConnected,
        setDrawerOpen,
        closeDrawer,
        restoreOverlay,
        acknowledgeAlert,
        dismissAlert,
        dismissAll,
    } = useLiveAlerts();

    const [filter, setFilter] = useState<FilterKey>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [prevTotalCount, setPrevTotalCount] = useState(totalCount);

    if (prevTotalCount !== totalCount) {
        setPrevTotalCount(totalCount);
        if (totalCount === 0) {
            setFilter("all");
            setSearchQuery("");
        }
    }

    const activeFilter: FilterKey = filter;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filteredAlerts = useMemo(() => {
        return alerts.filter((item) => {
            if (activeFilter !== "all" && getAlertSeverityTier(item) !== activeFilter) {
                return false;
            }
            if (!normalizedQuery) return true;
            const { flightCode, droneCode } = resolveAlertEntities(item, entityMap);
            const typeLabel = formatAlertTypeLabel(item.title, locale);
            return (
                item.message.toLowerCase().includes(normalizedQuery) ||
                item.title.toLowerCase().includes(normalizedQuery) ||
                typeLabel.toLowerCase().includes(normalizedQuery) ||
                (flightCode?.toLowerCase().includes(normalizedQuery) ?? false) ||
                (droneCode?.toLowerCase().includes(normalizedQuery) ?? false)
            );
        });
    }, [alerts, activeFilter, normalizedQuery, entityMap, locale]);

    const actionLabelMap: Record<string, string> = {
        "View Flight": t("viewFlight"),
        "View Drone": t("viewDrone"),
        "View Conflicts": t("viewConflicts"),
        "Confirm Action": t("confirmAction"),
        "Manage Incident": t("manageIncident"),
    };

    const isStreamLive = alertConnected || emergencyConnected;
    const isFiltering = activeFilter !== "all" || normalizedQuery.length > 0;
    const HeaderIcon = highestTier === "critical" ? Siren : BellRing;

    const filterTabs: ReadonlyArray<SideDrawerTabItem> = [
        {
            key: "all",
            label: t("filterAll"),
            count: totalCount,
        },
        {
            key: "critical",
            label: t("filterCritical"),
            count: tierCounts.critical,
            dotClass: "bg-red-600",
            disabled: totalCount === 0,
            muted: tierCounts.critical === 0 && activeFilter !== "critical",
        },
        {
            key: "warning",
            label: t("filterWarning"),
            count: tierCounts.warning,
            dotClass: "bg-amber-500",
            disabled: totalCount === 0,
            muted: tierCounts.warning === 0 && activeFilter !== "warning",
        },
        {
            key: "advisory",
            label: t("filterAdvisory"),
            count: tierCounts.advisory,
            dotClass: "bg-slate-400",
            disabled: totalCount === 0,
            muted: tierCounts.advisory === 0 && activeFilter !== "advisory",
        },
    ];

    const clearFilters = () => {
        setFilter("all");
        setSearchQuery("");
    };

    return (
        <SideDrawer
            open={isDrawerOpen}
            onOpenChange={setDrawerOpen}
            title={t("alertCenterTitle")}
            subtitle={
                <span className="truncate text-slate-500">
                    {isStreamLive ? t("liveFeed") : t("standbyFeed")}
                </span>
            }
            icon={HeaderIcon}
            closeLabel={t("closeAlertCenter")}
            tabs={filterTabs}
            activeTab={activeFilter}
            onTabChange={(key) => setFilter(key as FilterKey)}
            tabsMode="tabs"
            tabsAriaLabel={t("alertCenterTitle")}
            tabIdPrefix="alert-tab"
            tabPanelId="alert-center-tabpanel"
            search={
                totalCount > 0
                    ? {
                          value: searchQuery,
                          onChange: setSearchQuery,
                          placeholder: t("searchPlaceholder"),
                          ariaLabel: t("searchAria"),
                          clearLabel: tc("clearSearch"),
                      }
                    : undefined
            }
            footer={
                <>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="tabular-nums truncate">
                            {t("showingCount", {
                                shown: filteredAlerts.length,
                                total: totalCount,
                            })}
                        </span>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-slate-700 hover:text-slate-950 font-semibold underline underline-offset-2 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                            >
                                {t("clearFilters")}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {isOverlayMinimized && totalCount > 0 && (
                            <button
                                type="button"
                                onClick={restoreOverlay}
                                className="h-7 px-2.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-[11px] font-mono font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("showFloatingBanner")}</span>
                            </button>
                        )}

                        {totalCount > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    clearFilters();
                                    dismissAll();
                                }}
                                title={t("muteForSession")}
                                className="h-7 px-2.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-[11px] font-mono font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("muteAll")}</span>
                            </button>
                        )}
                    </div>
                </>
            }
        >
            {totalCount === 0 ? (
                <EmptyState
                    compact
                    icon={ShieldCheck}
                    title={t("noActiveAlertsTitle")}
                    description={t("noActiveAlertsDesc")}
                    className="py-14 px-5"
                />
            ) : filteredAlerts.length === 0 ? (
                <EmptyState
                    compact
                    title={t("noFilteredAlerts")}
                    action={{
                        label: t("clearFilters"),
                        onClick: clearFilters,
                    }}
                    className="py-12 px-5"
                />
            ) : (
                <div className="p-3 sm:p-3.5 space-y-2.5">
                    {filteredAlerts.map((item) => {
                        const severityStatus = getAlertSeverityStatus(item.severity, item.status);
                        const isPendingConfirm =
                            item.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
                        const isEmergency =
                            isPendingConfirm || item.severity === LIVE_ALERT_SEVERITY.EMERGENCY;
                        const typeLabel = formatAlertTypeLabel(item.title, locale);
                        const { flightCode, droneCode } = resolveAlertEntities(item, entityMap);
                        const actionLabel = actionLabelMap[item.actionLabel] ?? item.actionLabel;
                        const isAcknowledging = acknowledgingId === item.id;

                        return (
                            <article
                                key={item.id}
                                className="rounded-md border border-slate-200/95 bg-white px-3.5 py-3 shadow-2xs transition-colors hover:border-slate-300"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                        <StatusBadge
                                            status={severityStatus}
                                            className="text-[10px]"
                                        />

                                        {isPendingConfirm && (
                                            <span className="px-1.5 py-0.5 rounded border border-slate-200 bg-slate-100 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-600 leading-tight">
                                                {t("pendingConfirmTag")}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0 ml-auto">
                                        <span className="font-mono text-[11px] tabular-nums text-slate-400 whitespace-nowrap">
                                            {formatRelativeTime(item.timestamp)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => dismissAlert(item.id)}
                                            title={t("muteForSession")}
                                            aria-label={t("muteForSession")}
                                            className="w-6 h-6 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                        >
                                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="mt-1.5 text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wide text-slate-900 leading-snug break-words">
                                    {typeLabel}
                                </h3>

                                <p
                                    className="mt-1 text-xs text-slate-600 leading-relaxed line-clamp-3 break-words"
                                    title={item.message}
                                >
                                    {item.message}
                                </p>

                                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                        {flightCode && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/80 font-mono text-[10px] font-semibold text-slate-600">
                                                <PlaneTakeoff
                                                    className="w-2.5 h-2.5 text-slate-400 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>{flightCode}</span>
                                            </span>
                                        )}
                                        {droneCode && (
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200/80 font-mono text-[10px] font-semibold text-slate-600">
                                                <Drone
                                                    className="w-2.5 h-2.5 text-slate-400 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>{droneCode}</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                        {item.source === "alert" && (
                                            <ChamferButton
                                                variant="outline"
                                                size="xs"
                                                clip="xs"
                                                disabled={isAcknowledging}
                                                onClick={() => acknowledgeAlert(item.id)}
                                                innerClassName="font-mono text-[10px] uppercase tracking-wider px-2 h-6"
                                            >
                                                {isAcknowledging ? (
                                                    <Loader2
                                                        className="w-3 h-3 animate-spin"
                                                        aria-hidden="true"
                                                    />
                                                ) : (
                                                    <Check className="w-3 h-3" aria-hidden="true" />
                                                )}
                                                <span>{t("ackShort")}</span>
                                            </ChamferButton>
                                        )}

                                        <ChamferButton
                                            variant={isEmergency ? "dark" : "outline"}
                                            size="xs"
                                            clip="xs"
                                            href={item.actionUrl}
                                            onClick={() => flushSync(closeDrawer)}
                                            className={cn(
                                                isEmergency &&
                                                    "h-6 px-2.5 font-mono text-[10px] uppercase tracking-wider"
                                            )}
                                            innerClassName="font-mono text-[10px] uppercase tracking-wider px-2.5 h-6"
                                        >
                                            <span className="font-mono text-[10px] uppercase tracking-wider">
                                                {actionLabel}
                                            </span>
                                            <ArrowRight className="w-3 h-3" aria-hidden="true" />
                                        </ChamferButton>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </SideDrawer>
    );
}
