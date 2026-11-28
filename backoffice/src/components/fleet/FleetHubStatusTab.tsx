"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, Drone as DroneIcon } from "lucide-react";
import {
    ChamferCard,
    EmptyState,
    SideDrawer,
    Skeleton,
    StatusBadge,
    type SideDrawerTabItem,
} from "@/components/ui";
import { fleetService } from "@/services";
import { QUERY_KEYS, useHubsAll } from "@/hooks";
import { DRONE_STATUS, HUB_STATUS, type HubFleetStatus } from "@/types";

interface FleetHubStatusTabProps {
    hubStatuses: HubFleetStatus[];
    loading: boolean;
}

function HubAircraftSlideOver({
    hub,
    hubCode,
    onClose,
}: {
    hub: HubFleetStatus | null;
    hubCode?: string;
    onClose: () => void;
}) {
    const t = useTranslations("fleet.hubStatus");
    const hubId = hub?.hubId ?? "";
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [prevHubId, setPrevHubId] = useState(hubId);

    if (prevHubId !== hubId) {
        setPrevHubId(hubId);
        setSearchQuery("");
        setStatusFilter(null);
    }

    const { data: drones = [], isLoading } = useQuery({
        queryKey: [...QUERY_KEYS.fleetOverview, "hub-drones", hubId],
        queryFn: () => fleetService.getDronesAtHub(hubId),
        enabled: Boolean(hubId),
        staleTime: 1000 * 15,
    });

    const filteredDrones = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return drones.filter((d) => {
            if (statusFilter && (d.status || "").toLowerCase() !== statusFilter) {
                return false;
            }
            if (!q) return true;
            return (
                (d.registrationNumber || "").toLowerCase().includes(q) ||
                (d.manufacturer || "").toLowerCase().includes(q) ||
                (d.model || "").toLowerCase().includes(q) ||
                (d.status || "").toLowerCase().includes(q)
            );
        });
    }, [drones, searchQuery, statusFilter]);

    const total = hub?.totalDrones ?? 0;
    const available = hub?.availableDrones ?? 0;
    const busy = hub?.busyDrones ?? 0;
    const charging = hub?.chargingDrones ?? 0;
    const maintenance = hub?.maintenanceDrones ?? 0;
    const isFiltering = Boolean(statusFilter) || searchQuery.trim().length > 0;

    const statusTabs: ReadonlyArray<SideDrawerTabItem> = [
        {
            key: DRONE_STATUS.AVAILABLE,
            label: t("availShort"),
            count: available,
            dotClass: "bg-emerald-600",
            disabled: available === 0 && statusFilter !== DRONE_STATUS.AVAILABLE,
            muted: available === 0 && statusFilter !== DRONE_STATUS.AVAILABLE,
        },
        {
            key: DRONE_STATUS.IN_FLIGHT,
            label: t("flightShort"),
            count: busy,
            dotClass: "bg-sky-600",
            disabled: busy === 0 && statusFilter !== DRONE_STATUS.IN_FLIGHT,
            muted: busy === 0 && statusFilter !== DRONE_STATUS.IN_FLIGHT,
        },
        {
            key: DRONE_STATUS.CHARGING,
            label: t("chargeShort"),
            count: charging,
            dotClass: "bg-indigo-500",
            disabled: charging === 0 && statusFilter !== DRONE_STATUS.CHARGING,
            muted: charging === 0 && statusFilter !== DRONE_STATUS.CHARGING,
        },
        {
            key: DRONE_STATUS.MAINTENANCE,
            label: t("maintShort"),
            count: maintenance,
            dotClass: "bg-amber-500",
            disabled: maintenance === 0 && statusFilter !== DRONE_STATUS.MAINTENANCE,
            muted: maintenance === 0 && statusFilter !== DRONE_STATUS.MAINTENANCE,
        },
    ];

    const clearFilters = () => {
        setSearchQuery("");
        setStatusFilter(null);
    };

    return (
        <SideDrawer
            open={Boolean(hub)}
            onOpenChange={(open) => !open && onClose()}
            title={hub?.hubName || t("vertiportHubFallback")}
            subtitle={
                <>
                    {hubCode && (
                        <>
                            <span className="font-semibold text-slate-600 shrink-0">{hubCode}</span>
                            <span aria-hidden="true">·</span>
                        </>
                    )}
                    <span className="tabular-nums truncate text-slate-500">
                        {t("dronesAvailableCount", { available, total })}
                    </span>
                </>
            }
            icon={Building2}
            closeLabel={t("closeDrawerAria")}
            tabs={statusTabs}
            activeTab={statusFilter}
            onTabChange={(key) => setStatusFilter((prev) => (prev === key ? null : key))}
            tabsMode="toggle"
            tabsAriaLabel={t("stationedRoster")}
            tabIdPrefix="fleet-hub-tab"
            search={
                drones.length > 0
                    ? {
                          value: searchQuery,
                          onChange: setSearchQuery,
                          placeholder: t("filterPlaceholder"),
                          ariaLabel: t("filterAria"),
                          clearLabel: t("clearFilterAria"),
                      }
                    : undefined
            }
            footer={
                <>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="tabular-nums truncate">
                            {t("showingAircraft", {
                                shown: filteredDrones.length,
                                total: drones.length,
                            })}
                        </span>
                        {isFiltering && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="text-slate-700 hover:text-slate-950 font-semibold underline underline-offset-2 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                            >
                                {t("clearFilterAria")}
                            </button>
                        )}
                    </div>
                    <span className="tabular-nums shrink-0">
                        {t("padUtilizationPct", {
                            pct: Math.round(hub?.capacityUtilization ?? 0),
                        })}
                    </span>
                </>
            }
        >
            {isLoading ? (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label={t("loadingAria")}
                    className="p-3 sm:p-3.5 space-y-2.5"
                >
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="rounded-md border border-slate-200/95 bg-white px-3.5 py-3 flex items-center justify-between gap-3"
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
                    icon={DroneIcon}
                    title={isFiltering ? t("noMatchingAircraft") : t("noStationedAtHub")}
                    action={
                        isFiltering
                            ? {
                                  label: t("clearFilterAria"),
                                  onClick: clearFilters,
                              }
                            : undefined
                    }
                    className="py-12 px-5"
                />
            ) : (
                <div className="p-3 sm:p-3.5 space-y-2.5">
                    {filteredDrones.map((drone, index) => (
                        <div
                            key={drone.id ?? drone.registrationNumber ?? index}
                            className="rounded-md border border-slate-200/95 bg-white px-3.5 py-3 shadow-2xs flex items-center justify-between gap-3 text-xs transition-colors hover:border-slate-300"
                        >
                            <div className="min-w-0">
                                <div className="font-mono font-bold text-slate-900 truncate">
                                    {drone.registrationNumber || t("unnamedDrone")}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {[drone.manufacturer, drone.model].filter(Boolean).join(" ") ||
                                        "—"}
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
        </SideDrawer>
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

    const hubCodeMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const h of allHubs) {
            if (h.id && h.code) {
                map.set(h.id, h.code);
            }
        }
        return map;
    }, [allHubs]);

    const selectedHubCode = selectedHub?.hubId ? hubCodeMap.get(selectedHub.hubId) : undefined;

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
                                        <h2 className="text-sm font-bold text-slate-900 truncate">
                                            {hub.hubName || t("vertiportHubFallback")}
                                        </h2>
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
                                            className={`h-full transition-[width] duration-300 ${
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
                                        <ArrowRight
                                            className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-[color,transform]"
                                            aria-hidden="true"
                                        />
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
                hubCode={selectedHubCode}
                onClose={() => setSelectedHub(null)}
            />
        </>
    );
}
