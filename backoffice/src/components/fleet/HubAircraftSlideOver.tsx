"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Building2, Drone as DroneIcon } from "lucide-react";
import {
    EmptyState,
    SideDrawer,
    Skeleton,
    StatusBadge,
    type SideDrawerTabItem,
} from "@/components/ui";
import { useFleetHubDrones } from "@/hooks";
import { DRONE_STATUS, type HubFleetStatus } from "@/types";

interface HubAircraftSlideOverProps {
    hub: HubFleetStatus | null;
    hubCode?: string;
    onClose: () => void;
}

export function HubAircraftSlideOver({ hub, hubCode, onClose }: HubAircraftSlideOverProps) {
    const t = useTranslations("fleet.hubStatus");
    const hubId = hub?.hubId ?? "";
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const { data: drones = [], isLoading } = useFleetHubDrones(hubId);

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
