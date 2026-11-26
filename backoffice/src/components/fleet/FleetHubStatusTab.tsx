"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { ChamferCard, EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { fleetService } from "@/services";
import { QUERY_KEYS, useHubsAll } from "@/hooks";
import { HUB_STATUS, type HubFleetStatus } from "@/types";

interface FleetHubStatusTabProps {
    hubStatuses: HubFleetStatus[];
    loading: boolean;
}

function HubDroneDrawer({ hubId }: { hubId: string }) {
    const { data: drones = [], isLoading } = useQuery({
        queryKey: [...QUERY_KEYS.fleetOverview, "hub-drones", hubId],
        queryFn: () => fleetService.getDronesAtHub(hubId),
        staleTime: 1000 * 15,
    });

    if (isLoading) {
        return (
            <div
                role="status"
                aria-busy="true"
                aria-label="Loading stationed drones"
                className="pt-3 border-t border-slate-200 flex flex-col gap-2"
            >
                <Skeleton className="h-3 w-28" />
                {Array.from({ length: 2 }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-4 w-16" />
                    </div>
                ))}
                <span className="sr-only">Loading stationed drones...</span>
            </div>
        );
    }

    if (drones.length === 0) {
        return (
            <div className="pt-3 border-t border-slate-200 text-xs font-mono text-slate-400">
                No drones stationed at this hub.
            </div>
        );
    }

    return (
        <div className="pt-3 border-t border-slate-200 flex flex-col gap-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Stationed Aircraft ({drones.length})
            </span>
            <div className="divide-y divide-slate-100">
                {drones.map((drone, index) => (
                    <div
                        key={drone.id ?? drone.registrationNumber ?? index}
                        className="py-2 flex items-center justify-between gap-2 text-xs"
                    >
                        <div className="min-w-0">
                            <div className="font-mono font-semibold text-slate-800 truncate">
                                {drone.registrationNumber || "Unnamed Drone"}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                                {[drone.manufacturer, drone.model].filter(Boolean).join(" ") || "—"}
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                            {drone.batteryHealthPct != null && (
                                <span className="font-mono text-[11px] tabular-nums text-slate-600">
                                    {Math.round(drone.batteryHealthPct)}%
                                </span>
                            )}
                            <StatusBadge status={drone.status ?? "unknown"} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FleetHubStatusTab({ hubStatuses, loading }: FleetHubStatusTabProps) {
    const [expandedHubId, setExpandedHubId] = useState<string | null>(null);
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
                    title="No Vertiport Hub Data"
                    description="Register active vertiport hubs and assign drones to monitor hub-level readiness."
                />
            </ChamferCard>
        );
    }

    return (
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
                const isExpanded = expandedHubId === hubId && Boolean(hubId);
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
                                        {hub.hubName || "Vertiport Hub"}
                                    </h3>
                                    <p className="text-[11px] font-mono text-slate-500">
                                        {available}/{total} drones available
                                    </p>
                                </div>
                                <StatusBadge
                                    status={readinessStatus}
                                    label={
                                        readinessStatus === "active"
                                            ? "READY"
                                            : readinessStatus === "warning"
                                              ? "LOW STOCK"
                                              : "STANDBY"
                                    }
                                />
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                    <span>Pad Utilization</span>
                                    <span className="font-bold text-slate-800 tabular-nums">
                                        {utilizationPct}%
                                    </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${
                                            utilizationPct >= 85 ? "bg-amber-500" : "bg-slate-700"
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
                                        Avail
                                    </div>
                                </div>
                                <div>
                                    <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                        {busy}
                                    </div>
                                    <div className="text-[10px] font-mono uppercase text-slate-500">
                                        Flight
                                    </div>
                                </div>
                                <div>
                                    <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                        {charging}
                                    </div>
                                    <div className="text-[10px] font-mono uppercase text-slate-500">
                                        Charge
                                    </div>
                                </div>
                                <div>
                                    <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                                        {maintenance}
                                    </div>
                                    <div className="text-[10px] font-mono uppercase text-slate-500">
                                        Maint
                                    </div>
                                </div>
                            </div>

                            {hubId && (
                                <button
                                    type="button"
                                    aria-expanded={isExpanded}
                                    onClick={() => setExpandedHubId(isExpanded ? null : hubId)}
                                    className="pt-2.5 border-t border-slate-200 inline-flex items-center justify-between w-full text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                                >
                                    <span>
                                        {isExpanded
                                            ? "Hide stationed aircraft"
                                            : `Stationed aircraft (${total})`}
                                    </span>
                                    {isExpanded ? (
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                </button>
                            )}

                            {isExpanded && <HubDroneDrawer hubId={hubId} />}
                        </div>
                    </ChamferCard>
                );
            })}
        </div>
    );
}
