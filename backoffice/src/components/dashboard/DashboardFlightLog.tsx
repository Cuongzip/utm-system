"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import { compareCreatedDesc, formatDateTime } from "@/utils";
import {
    DEFAULT_FLIGHT_STATUS,
    FLIGHT_STATUS,
    type Flight,
    type FlightStatus,
    type Hub,
} from "@/types";

export interface DashboardFlightLogProps {
    flights: Flight[];
    hubs?: Hub[];
    isLoading: boolean;
}

function compactHubCode(raw: string): string {
    return raw.replace(/^HUB-/i, "");
}

export function DashboardFlightLog({
    flights = [],
    hubs = [],
    isLoading = false,
}: DashboardFlightLogProps) {
    const hubCodeMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const h of hubs) {
            if (h.id) {
                map.set(h.id, h.code || h.name || "HUB");
            }
        }
        return map;
    }, [hubs]);

    const recentFlights = useMemo(() => {
        return [...flights].sort(compareCreatedDesc).slice(0, 6);
    }, [flights]);

    return (
        <ChamferCard size="md" className="w-full lg:h-[312px]">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono uppercase tracking-wider">
                        Recent Flights
                    </span>
                    {!isLoading && flights.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-semibold text-slate-500 tabular-nums">
                            {flights.length}
                        </span>
                    )}
                </div>
                <Link
                    href="/dashboard/flights"
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded px-1"
                >
                    <span>View all</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
            </div>

            <div className="overflow-y-auto overscroll-contain utm-scroll divide-y divide-[var(--color-border-subtle)] flex-1">
                {isLoading ? (
                    <div>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="px-4 py-2.5 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-2.5 flex-1">
                                    <Skeleton className="h-3.5 w-28" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                ) : recentFlights.length === 0 ? (
                    <EmptyState compact title="No recent flight entries" className="py-8" />
                ) : (
                    recentFlights.map((flight, idx) => {
                        const flightCode = flight.flightNumber || "UNNUMBERED";
                        const depFull = flight.departureHubId
                            ? hubCodeMap.get(flight.departureHubId)
                            : null;
                        const arrFull = flight.arrivalHubId
                            ? hubCodeMap.get(flight.arrivalHubId)
                            : null;
                        const shortRoute =
                            depFull && arrFull
                                ? `${compactHubCode(depFull)} → ${compactHubCode(arrFull)}`
                                : null;
                        const fullRoute =
                            depFull && arrFull ? `${depFull} → ${arrFull}` : undefined;
                        const rawTimestamp =
                            flight.createdOn || flight.actualDeparture || flight.scheduledDeparture;
                        const shortTime = formatDateTime(rawTimestamp, "HH:mm") || "--:--";
                        const fullTime = formatDateTime(rawTimestamp, "MMM d · HH:mm") || undefined;
                        const status: FlightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;

                        return (
                            <Link
                                key={flight.id || idx}
                                href={
                                    flight.id
                                        ? `/dashboard/flights/${flight.id}`
                                        : "/dashboard/flights"
                                }
                                className="px-4 py-[11px] grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] items-center gap-3 hover:bg-[var(--color-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
                            >
                                <span className="text-xs font-bold font-mono text-[var(--color-text-primary)] truncate">
                                    {flightCode}
                                </span>

                                <div className="hidden sm:flex items-center min-w-0">
                                    {shortRoute ? (
                                        <span
                                            title={fullRoute}
                                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-mono font-medium text-slate-600 truncate max-w-full"
                                        >
                                            {shortRoute}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-mono text-slate-400">
                                            Direct
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-3 shrink-0">
                                    <span
                                        title={fullTime}
                                        className="text-[11px] font-mono text-[var(--color-text-muted)] tabular-nums hidden xl:inline"
                                    >
                                        {shortTime}
                                    </span>
                                    <StatusBadge
                                        status={status}
                                        label={
                                            status === FLIGHT_STATUS.EMERGENCY_LANDING
                                                ? "EMERG LAND"
                                                : undefined
                                        }
                                        showDot
                                        className="min-w-[92px] justify-end"
                                    />
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>
        </ChamferCard>
    );
}
