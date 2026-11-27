"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Search, X } from "lucide-react";
import { ChamferCard, EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { fleetService } from "@/services";
import { QUERY_KEYS, useHubsAll } from "@/hooks";
import { HUB_STATUS, type HubFleetStatus } from "@/types";

interface FleetHubStatusTabProps {
    hubStatuses: HubFleetStatus[];
    loading: boolean;
}

function HubAircraftSlideOver({
    hub,
    onClose,
}: {
    hub: HubFleetStatus | null;
    onClose: () => void;
}) {
    const t = useTranslations("fleet.hubStatus");
    const [searchQuery, setSearchQuery] = useState("");
    const hubId = hub?.hubId ?? "";

    const { data: drones = [], isLoading } = useQuery({
        queryKey: [...QUERY_KEYS.fleetOverview, "hub-drones", hubId],
        queryFn: () => fleetService.getDronesAtHub(hubId),
        enabled: Boolean(hubId),
        staleTime: 1000 * 15,
    });

    const filteredDrones = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return drones;
        return drones.filter(
            (d) =>
                (d.registrationNumber || "").toLowerCase().includes(q) ||
                (d.manufacturer || "").toLowerCase().includes(q) ||
                (d.model || "").toLowerCase().includes(q) ||
                (d.status || "").toLowerCase().includes(q)
        );
    }, [drones, searchQuery]);

    const available = hub?.availableDrones ?? 0;
    const busy = hub?.busyDrones ?? 0;
    const charging = hub?.chargingDrones ?? 0;
    const maintenance = hub?.maintenanceDrones ?? 0;

    return (
        <DialogPrimitive.Root open={Boolean(hub)} onOpenChange={(open) => !open && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-[1px]" />
                <DialogPrimitive.Content
                    aria-describedby={undefined}
                    className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-[var(--color-surface-panel)] border-l border-[var(--color-border-strong)] shadow-2xl flex flex-col focus:outline-none"
                >
                    <div className="px-5 py-4 border-b border-[var(--color-border-default)] flex items-start justify-between gap-3 shrink-0">
                        <div className="min-w-0">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                                {t("stationedRoster")}
                            </span>
                            <DialogPrimitive.Title className="text-base font-bold text-slate-900 truncate mt-0.5">
                                {hub?.hubName || t("vertiportHubFallback")}
                            </DialogPrimitive.Title>
                        </div>
                        <DialogPrimitive.Close asChild>
                            <button
                                type="button"
                                aria-label={t("closeDrawerAria")}
                                className="w-7 h-7 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:bg-[var(--color-surface-card)] text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                            >
                                <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                        </DialogPrimitive.Close>
                    </div>

                    <div className="grid grid-cols-4 divide-x divide-[var(--color-border-default)] border-b border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] py-2.5 text-center shrink-0">
                        <div>
                            <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                {available}
                            </div>
                            <div className="text-[10px] font-mono uppercase text-slate-500">
                                {t("availShort")}
                            </div>
                        </div>
                        <div>
                            <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                {busy}
                            </div>
                            <div className="text-[10px] font-mono uppercase text-slate-500">
                                {t("flightShort")}
                            </div>
                        </div>
                        <div>
                            <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                {charging}
                            </div>
                            <div className="text-[10px] font-mono uppercase text-slate-500">
                                {t("chargeShort")}
                            </div>
                        </div>
                        <div>
                            <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                {maintenance}
                            </div>
                            <div className="text-[10px] font-mono uppercase text-slate-500">
                                {t("maintShort")}
                            </div>
                        </div>
                    </div>

                    {drones.length > 3 && (
                        <div className="px-5 py-2.5 border-b border-[var(--color-border-default)] shrink-0">
                            <div className="relative flex items-center">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("filterPlaceholder")}
                                    aria-label={t("filterAria")}
                                    className="w-full h-8 pl-8 pr-7 text-xs rounded border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[var(--color-border-dark)] focus:bg-white"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        aria-label={t("clearFilterAria")}
                                        className="absolute right-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5">
                        {isLoading ? (
                            <div
                                role="status"
                                aria-busy="true"
                                aria-label={t("loadingAria")}
                                className="divide-y divide-slate-100 py-2"
                            >
                                {Array.from({ length: 5 }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="py-3 flex items-center justify-between gap-3"
                                    >
                                        <div className="space-y-1.5">
                                            <Skeleton className="h-3.5 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                        <Skeleton className="h-5 w-20" />
                                    </div>
                                ))}
                                <span className="sr-only">{t("loadingSr")}</span>
                            </div>
                        ) : filteredDrones.length === 0 ? (
                            <EmptyState
                                compact
                                title={
                                    searchQuery ? t("noMatchingAircraft") : t("noStationedAtHub")
                                }
                                className="py-10"
                            />
                        ) : (
                            <div className="divide-y divide-[var(--color-border-subtle)]">
                                {filteredDrones.map((drone, index) => (
                                    <div
                                        key={drone.id ?? drone.registrationNumber ?? index}
                                        className="py-3 flex items-center justify-between gap-3 text-xs"
                                    >
                                        <div className="min-w-0">
                                            <div className="font-mono font-bold text-slate-900 truncate">
                                                {drone.registrationNumber || t("unnamedDrone")}
                                            </div>
                                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                                {[drone.manufacturer, drone.model]
                                                    .filter(Boolean)
                                                    .join(" ") || "—"}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 shrink-0">
                                            {drone.batteryHealthPct != null && (
                                                <span className="font-mono text-[11px] font-semibold tabular-nums text-slate-600">
                                                    {Math.round(drone.batteryHealthPct)}%
                                                </span>
                                            )}
                                            <StatusBadge status={drone.status ?? "unknown"} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] flex items-center justify-between text-[11px] font-mono text-slate-500 shrink-0">
                        <span>
                            {t("showingAircraft", {
                                shown: filteredDrones.length,
                                total: drones.length,
                            })}
                        </span>
                        <span>
                            {t("padUtilizationPct", {
                                pct: Math.round(hub?.capacityUtilization ?? 0),
                            })}
                        </span>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

export function FleetHubStatusTab({ hubStatuses, loading }: FleetHubStatusTabProps) {
    const t = useTranslations("fleet.hubStatus");
    const [selectedHub, setSelectedHub] = useState<HubFleetStatus | null>(null);
    const { data: allHubs = [] } = useHubsAll();

    const activeHubIds = useMemo(() => {
        const set = new Set<string>();
        for (const h of allHubs) {
            if ((h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE) {
                set.add(h.id);
            }
        }
        return set;
    }, [allHubs]);

    const visibleStatuses = useMemo(() => {
        const filtered =
            activeHubIds.size > 0
                ? hubStatuses.filter((hs) => !hs.hubId || activeHubIds.has(hs.hubId))
                : hubStatuses;

        return [...filtered].sort((a, b) => {
            const diff = (b.totalDrones ?? 0) - (a.totalDrones ?? 0);
            if (diff !== 0) return diff;
            return (a.hubName || "").localeCompare(b.hubName || "");
        });
    }, [hubStatuses, activeHubIds]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <ChamferCard key={idx} size="md">
                        <div className="p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                            <div className="grid grid-cols-4 gap-2 pt-2">
                                {Array.from({ length: 4 }).map((__, i) => (
                                    <Skeleton key={i} className="h-8 w-full" />
                                ))}
                            </div>
                        </div>
                    </ChamferCard>
                ))}
            </div>
        );
    }

    if (visibleStatuses.length === 0) {
        return (
            <ChamferCard size="md">
                <EmptyState
                    icon={Building2}
                    title={t("noHubDataTitle")}
                    description={t("noHubDataDesc")}
                />
            </ChamferCard>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleStatuses.map((hub) => {
                    const hubId = hub.hubId ?? "";
                    const total = hub.totalDrones ?? 0;
                    const available = hub.availableDrones ?? 0;
                    const busy = hub.busyDrones ?? 0;
                    const charging = hub.chargingDrones ?? 0;
                    const maintenance = hub.maintenanceDrones ?? 0;
                    const utilizationPct = Math.min(
                        100,
                        Math.max(0, Math.round(hub.capacityUtilization ?? 0))
                    );
                    const readinessStatus =
                        available === 0 && total > 0
                            ? "warning"
                            : available > 0
                              ? "active"
                              : "inactive";

                    return (
                        <ChamferCard key={hubId || hub.hubName} size="md">
                            <div className="p-4 flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 truncate">
                                            {hub.hubName || t("vertiportHubFallback")}
                                        </h3>
                                        <p className="text-[11px] font-mono text-slate-500">
                                            {t("dronesAvailableCount", { available, total })}
                                        </p>
                                    </div>
                                    <StatusBadge
                                        status={readinessStatus}
                                        label={
                                            readinessStatus === "active"
                                                ? t("ready")
                                                : readinessStatus === "warning"
                                                  ? t("lowStock")
                                                  : t("standby")
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                        <span>{t("padUtilization")}</span>
                                        <span className="font-bold text-slate-800 tabular-nums">
                                            {utilizationPct}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${
                                                utilizationPct >= 85
                                                    ? "bg-amber-500"
                                                    : "bg-slate-700"
                                            }`}
                                            style={{ width: `${utilizationPct}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 divide-x divide-slate-200 border-t border-slate-100 pt-2.5 text-center">
                                    <div>
                                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                            {available}
                                        </div>
                                        <div className="text-[10px] font-mono uppercase text-slate-500">
                                            {t("availShort")}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                            {busy}
                                        </div>
                                        <div className="text-[10px] font-mono uppercase text-slate-500">
                                            {t("flightShort")}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                            {charging}
                                        </div>
                                        <div className="text-[10px] font-mono uppercase text-slate-500">
                                            {t("chargeShort")}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                            {maintenance}
                                        </div>
                                        <div className="text-[10px] font-mono uppercase text-slate-500">
                                            {t("maintShort")}
                                        </div>
                                    </div>
                                </div>

                                {hubId && total > 0 ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedHub(hub)}
                                        className="pt-2.5 border-t border-slate-200 inline-flex items-center justify-between w-full text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded group"
                                    >
                                        <span>{t("viewStationedAircraft", { total })}</span>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-all" />
                                    </button>
                                ) : (
                                    <div className="pt-2.5 border-t border-slate-100 text-xs font-mono text-slate-400">
                                        {t("noStationedAircraft")}
                                    </div>
                                )}
                            </div>
                        </ChamferCard>
                    );
                })}
            </div>

            <HubAircraftSlideOver
                key={selectedHub?.hubId ?? "closed"}
                hub={selectedHub}
                onClose={() => setSelectedHub(null)}
            />
        </>
    );
}
