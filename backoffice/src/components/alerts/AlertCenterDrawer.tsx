"use client";

import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useLocale, useTranslations } from "next-intl";
import {
    ArrowRight,
    BellRing,
    Bot,
    Check,
    Eye,
    EyeOff,
    Loader2,
    PlaneTakeoff,
    Search,
    ShieldCheck,
    Siren,
    X,
} from "lucide-react";
import { ChamferButton, EmptyState, StatusBadge } from "@/components/ui";
import { useLiveAlerts } from "@/hooks/useLiveAlerts";
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

const CARD_ACCENT_CLASS: Record<AlertSeverityTier, string> = {
    critical: "border-l-red-600",
    warning: "border-l-amber-500",
    advisory: "border-l-slate-400",
};

const SEVERITY_PILL_CLASS: Record<AlertSeverityTier, string> = {
    critical: "bg-red-50 border-red-200/85 text-red-700",
    warning: "bg-amber-50 border-amber-200/85 text-amber-800",
    advisory: "bg-slate-100 border-slate-200/85 text-slate-600",
};

const SEVERITY_BADGE_TEXT_CLASS: Record<AlertSeverityTier, string> = {
    critical: "text-red-700",
    warning: "text-amber-800",
    advisory: "text-slate-600",
};

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

    const filterTabs: ReadonlyArray<{
        key: FilterKey;
        label: string;
        count: number;
        dotClass?: string;
    }> = [
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
        },
        {
            key: "warning",
            label: t("filterWarning"),
            count: tierCounts.warning,
            dotClass: "bg-amber-500",
        },
        {
            key: "advisory",
            label: t("filterAdvisory"),
            count: tierCounts.advisory,
            dotClass: "bg-slate-400",
        },
    ];

    return (
        <DialogPrimitive.Root open={isDrawerOpen} onOpenChange={setDrawerOpen}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="utm-drawer-overlay fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1.5px]" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className="utm-drawer-content fixed inset-y-0 right-0 z-50 w-full max-w-[448px] bg-white border-l border-[var(--color-border-strong)] shadow-2xl flex flex-col focus:outline-none"
                >
                    <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-[var(--color-border-default)] flex items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span
                                className={cn(
                                    "chamfer-xs w-8 h-8 flex items-center justify-center shrink-0 text-white",
                                    highestTier === "critical"
                                        ? "bg-red-600"
                                        : highestTier === "warning"
                                          ? "bg-amber-500"
                                          : "bg-slate-800"
                                )}
                                aria-hidden="true"
                            >
                                <HeaderIcon className="w-4 h-4" />
                            </span>

                            <div className="min-w-0">
                                <DialogPrimitive.Title className="text-xs sm:text-[13px] font-mono font-bold uppercase tracking-wider text-slate-900 truncate leading-tight">
                                    {t("alertCenterTitle")}
                                </DialogPrimitive.Title>
                                <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                                    <StatusBadge
                                        status={isStreamLive ? "live" : "standby"}
                                        dotShape="circle"
                                        className="text-[10px] text-slate-500"
                                    />
                                    <span aria-hidden="true">·</span>
                                    <span className="tabular-nums truncate text-slate-500">
                                        {totalCount > 0
                                            ? t("activeTotalShort", { count: totalCount })
                                            : t("nominalShort")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogPrimitive.Close asChild>
                            <button
                                type="button"
                                aria-label={t("closeAlertCenter")}
                                className="btn-icon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 shrink-0"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </DialogPrimitive.Close>
                    </div>

                    <div
                        role="tablist"
                        aria-label={t("alertCenterTitle")}
                        className="grid grid-cols-4 divide-x divide-[var(--color-border-default)] border-b border-[var(--color-border-default)] bg-slate-50/85 shrink-0"
                    >
                        {filterTabs.map((tab, idx) => {
                            const selected = activeFilter === tab.key;
                            const isDisabled = totalCount === 0 && tab.key !== "all";
                            const muted = tab.key !== "all" && tab.count === 0 && !selected;
                            return (
                                <button
                                    key={tab.key}
                                    id={`alert-tab-${tab.key}`}
                                    type="button"
                                    role="tab"
                                    disabled={isDisabled}
                                    aria-selected={selected}
                                    aria-controls="alert-center-tabpanel"
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => setFilter(tab.key)}
                                    onKeyDown={(e) => {
                                        if (totalCount === 0) return;
                                        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                                        e.preventDefault();
                                        const delta = e.key === "ArrowRight" ? 1 : -1;
                                        const nextIdx =
                                            (idx + delta + filterTabs.length) % filterTabs.length;
                                        const nextKey = filterTabs[nextIdx].key;
                                        setFilter(nextKey);
                                        document.getElementById(`alert-tab-${nextKey}`)?.focus();
                                    }}
                                    className={cn(
                                        "relative py-2.5 px-1.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                                        isDisabled ? "cursor-default" : "cursor-pointer",
                                        selected
                                            ? "bg-white shadow-[inset_0_-2px_0_0_#0f172a]"
                                            : !isDisabled && "hover:bg-white/80",
                                        muted && "opacity-60"
                                    )}
                                >
                                    <div className="inline-flex items-center justify-center gap-1.5 font-mono text-sm font-bold tabular-nums text-slate-900 leading-tight">
                                        {tab.dotClass && (
                                            <span
                                                className={cn(
                                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                                    tab.dotClass
                                                )}
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span>{tab.count}</span>
                                    </div>
                                    <div
                                        className={cn(
                                            "mt-0.5 text-[10px] font-mono uppercase tracking-wider truncate",
                                            selected
                                                ? "font-bold text-slate-900"
                                                : "font-medium text-slate-500"
                                        )}
                                    >
                                        {tab.label}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {totalCount > 0 && (
                        <div className="px-3.5 sm:px-4 py-2 bg-white border-b border-[var(--color-border-default)] shrink-0">
                            <div className="relative flex items-center">
                                <Search
                                    className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none"
                                    aria-hidden="true"
                                />
                                <input
                                    type="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("searchPlaceholder")}
                                    aria-label={t("searchAria")}
                                    className="w-full h-8 pl-8 pr-7 text-xs rounded-md border border-[var(--color-border-default)] bg-slate-50/75 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-border-dark)] focus:bg-white transition-colors [&::-webkit-search-cancel-button]:hidden"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        aria-label={tc("clearSearch")}
                                        className="absolute right-2 p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div
                        id="alert-center-tabpanel"
                        role="tabpanel"
                        aria-labelledby={`alert-tab-${activeFilter}`}
                        className="flex-1 min-h-0 overflow-y-auto overscroll-contain utm-scroll bg-slate-50/85"
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
                                    onClick: () => {
                                        setFilter("all");
                                        setSearchQuery("");
                                    },
                                }}
                                className="py-12 px-5"
                            />
                        ) : (
                            <div className="p-3 sm:p-3.5 space-y-2.5">
                                {filteredAlerts.map((item) => {
                                    const tier = getAlertSeverityTier(item);
                                    const severityStatus = getAlertSeverityStatus(
                                        item.severity,
                                        item.status
                                    );
                                    const isPendingConfirm =
                                        item.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
                                    const isEmergency =
                                        isPendingConfirm ||
                                        item.severity === LIVE_ALERT_SEVERITY.EMERGENCY;
                                    const typeLabel = formatAlertTypeLabel(item.title, locale);
                                    const { flightCode, droneCode } = resolveAlertEntities(
                                        item,
                                        entityMap
                                    );
                                    const actionLabel =
                                        actionLabelMap[item.actionLabel] ?? item.actionLabel;
                                    const isAcknowledging = acknowledgingId === item.id;

                                    return (
                                        <article
                                            key={item.id}
                                            className={cn(
                                                "rounded-md border border-slate-200/95 border-l-[3px] bg-white px-3.5 py-3 shadow-2xs transition-colors hover:border-slate-300",
                                                CARD_ACCENT_CLASS[tier],
                                                isPendingConfirm &&
                                                    "bg-red-50/30 border-red-200/90 hover:border-red-300"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                    <span
                                                        className={cn(
                                                            "px-1.5 py-0.5 rounded border inline-flex items-center",
                                                            SEVERITY_PILL_CLASS[tier]
                                                        )}
                                                    >
                                                        <StatusBadge
                                                            status={severityStatus}
                                                            dotShape="circle"
                                                            className={cn(
                                                                "text-[10px]",
                                                                SEVERITY_BADGE_TEXT_CLASS[tier]
                                                            )}
                                                        />
                                                    </span>

                                                    {isPendingConfirm && (
                                                        <span className="px-1.5 py-0.5 rounded border border-amber-300/85 bg-amber-100/75 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900 leading-tight">
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
                                                        <X
                                                            className="w-3.5 h-3.5"
                                                            aria-hidden="true"
                                                        />
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
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/90 font-mono text-[10px] font-semibold text-slate-700">
                                                            <PlaneTakeoff
                                                                className="w-2.5 h-2.5 text-slate-500 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                            <span>{flightCode}</span>
                                                        </span>
                                                    )}
                                                    {droneCode && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/90 font-mono text-[10px] font-semibold text-slate-700">
                                                            <Bot
                                                                className="w-2.5 h-2.5 text-slate-500 shrink-0"
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
                                                            onClick={() =>
                                                                acknowledgeAlert(item.id)
                                                            }
                                                            innerClassName="font-mono text-[10px] uppercase tracking-wider px-2 h-6"
                                                        >
                                                            {isAcknowledging ? (
                                                                <Loader2
                                                                    className="w-3 h-3 animate-spin"
                                                                    aria-hidden="true"
                                                                />
                                                            ) : (
                                                                <Check
                                                                    className="w-3 h-3"
                                                                    aria-hidden="true"
                                                                />
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
                                                        <ArrowRight
                                                            className="w-3 h-3"
                                                            aria-hidden="true"
                                                        />
                                                    </ChamferButton>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="px-4 sm:px-5 py-2.5 bg-white border-t border-[var(--color-border-default)] flex items-center justify-between gap-2 text-[11px] font-mono text-slate-500 shrink-0">
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
                                    onClick={() => {
                                        setFilter("all");
                                        setSearchQuery("");
                                    }}
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
                                        setFilter("all");
                                        setSearchQuery("");
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
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
