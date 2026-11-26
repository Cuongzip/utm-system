"use client";

import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { CloudSun } from "lucide-react";
import { ChamferCard, EmptyState, Skeleton, StatusBadge } from "@/components/ui";
import { weatherAisService } from "@/services";
import { QUERY_KEYS } from "@/hooks";
import { HUB_STATUS, type Hub, type HubGoNoGo } from "@/types";

interface WeatherGoNoGoStripProps {
    hubs: Hub[];
    selectedHubId: string;
    onSelectHub: (hubId: string) => void;
    loadingHubs: boolean;
}

export function WeatherGoNoGoStrip({
    hubs,
    selectedHubId,
    onSelectHub,
    loadingHubs,
}: WeatherGoNoGoStripProps) {
    const [showInactive, setShowInactive] = useState(false);

    const { activeHubs, inactiveCount } = useMemo(() => {
        const active = hubs.filter((h) => (h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE);
        return { activeHubs: active, inactiveCount: hubs.length - active.length };
    }, [hubs]);

    const visibleHubs = useMemo(() => {
        if (showInactive || activeHubs.length === 0) return hubs;
        const selectedInInactive = hubs.find(
            (h) => h.id === selectedHubId && (h.status || "").toLowerCase() === HUB_STATUS.INACTIVE
        );
        return selectedInInactive ? [...activeHubs, selectedInInactive] : activeHubs;
    }, [hubs, activeHubs, showInactive, selectedHubId]);

    const results = useQueries({
        queries: visibleHubs.map((hub) => ({
            queryKey: QUERY_KEYS.weatherHubGoNoGo(hub.id),
            queryFn: () => weatherAisService.getHubGoNoGo(hub.id),
            staleTime: 1000 * 60 * 2,
            retry: false,
        })),
    });

    if (loadingHubs) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {Array.from({ length: 5 }).map((_, idx) => (
                    <ChamferCard key={idx} size="sm">
                        <div className="px-3.5 py-2.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-full" />
                        </div>
                    </ChamferCard>
                ))}
            </div>
        );
    }

    if (hubs.length === 0) {
        return (
            <ChamferCard size="md">
                <EmptyState
                    icon={CloudSun}
                    title="No Vertiport Hubs Configured"
                    description="Register a vertiport hub to evaluate weather status."
                />
            </ChamferCard>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Vertiport Go / No-Go Matrix ({visibleHubs.length})
                </span>
                {inactiveCount > 0 && activeHubs.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowInactive((prev) => !prev)}
                        className="text-[11px] font-mono text-slate-500 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded px-1.5 py-0.5"
                    >
                        {showInactive
                            ? `Hide inactive (${inactiveCount})`
                            : `Show inactive (${inactiveCount})`}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {visibleHubs.map((hub, idx) => {
                    const query = results[idx];
                    const data: HubGoNoGo | undefined = query?.data;
                    const isSelected = selectedHubId === hub.id;
                    const verdict = data?.verdict ?? "UNKNOWN";
                    const windMs = data?.windSpeedMs;
                    const visKm =
                        data?.visibilityM != null
                            ? (data.visibilityM / 1000).toFixed(1)
                            : undefined;
                    const alertReason =
                        verdict !== "GO" && data?.reasons && data.reasons.length > 0
                            ? data.reasons[0]
                            : undefined;

                    return (
                        <ChamferCard
                            key={hub.id}
                            size="sm"
                            className={`transition-colors ${
                                isSelected ? "!bg-slate-900" : "hover:!bg-slate-400"
                            }`}
                            innerClassName={isSelected ? "bg-slate-100/90" : undefined}
                        >
                            <button
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() => onSelectHub(hub.id)}
                                className="w-full text-left px-3.5 py-2.5 flex flex-col gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
                            >
                                <div className="flex items-center justify-between gap-2 w-full">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 truncate">
                                        {hub.code}
                                    </span>
                                    {query?.isLoading ? (
                                        <Skeleton className="h-4 w-12 shrink-0" />
                                    ) : query?.isError ? (
                                        <StatusBadge status="offline" label="N/A" />
                                    ) : (
                                        <StatusBadge
                                            status={verdict}
                                            label={verdict.replace(/_/g, " ")}
                                        />
                                    )}
                                </div>

                                <div
                                    className="text-xs font-bold text-slate-900 truncate w-full"
                                    title={hub.name}
                                >
                                    {hub.name}
                                </div>

                                <div className="pt-1.5 border-t border-slate-200/80 flex items-center justify-between gap-1.5 text-[11px] font-mono text-slate-600 tabular-nums w-full">
                                    <span>{windMs != null ? `${windMs.toFixed(1)}m/s` : "—"}</span>
                                    <span className="text-slate-300" aria-hidden="true">
                                        ·
                                    </span>
                                    <span>{visKm != null ? `${visKm}km` : "—"}</span>
                                    <span className="text-slate-300" aria-hidden="true">
                                        ·
                                    </span>
                                    <span className="font-bold text-slate-800">
                                        {data?.flightCategory || "—"}
                                    </span>
                                </div>

                                {alertReason && (
                                    <div
                                        className="text-[10px] text-amber-700 font-medium truncate w-full"
                                        title={alertReason}
                                    >
                                        {alertReason}
                                    </div>
                                )}
                            </button>
                        </ChamferCard>
                    );
                })}
            </div>
        </div>
    );
}
