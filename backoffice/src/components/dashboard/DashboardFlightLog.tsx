"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/utils/format";
import { DEFAULT_FLIGHT_STATUS, type Flight, type FlightStatus } from "@/types";

export interface DashboardFlightLogProps {
    flights: Flight[];
    isLoading?: boolean;
}

export function DashboardFlightLog({ flights = [], isLoading = false }: DashboardFlightLogProps) {
    const recentFlights = useMemo(() => {
        const getFlightTime = (f: Flight) =>
            new Date(f.actualDeparture || f.scheduledDeparture || 0).getTime();
        return [...flights].sort((a, b) => getFlightTime(b) - getFlightTime(a)).slice(0, 5);
    }, [flights]);

    return (
        <ChamferCard size="lg" className="h-full min-h-[340px]">
            <div className="p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border-subtle)]">
                        <div className="flex items-center space-x-2 text-xs font-bold text-[var(--color-text-primary)] font-mono tracking-wider">
                            <Activity className="h-4 w-4 text-cyan-600" />
                            <span>FLIGHT LOG</span>
                        </div>
                        <span className="text-xs font-mono text-[var(--color-text-muted)]">
                            {isLoading ? "SYNCING..." : `${recentFlights.length} RECENT ENTRIES`}
                        </span>
                    </div>

                    <div className="mt-3 divide-y divide-[var(--color-border-subtle)]">
                        {isLoading ? (
                            <div className="py-2 space-y-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="animate-pulse flex items-center justify-between p-2 rounded bg-slate-50/70 dark:bg-slate-800/40"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                                            <div className="space-y-1.5">
                                                <div className="w-24 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
                                                <div className="w-32 h-2.5 bg-slate-100 dark:bg-slate-800 rounded" />
                                            </div>
                                        </div>
                                        <div className="w-16 h-5 bg-slate-200 dark:bg-slate-700 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : recentFlights.length === 0 ? (
                            <EmptyState compact title="No recent flight entries" />
                        ) : (
                            recentFlights.map((flight, idx) => {
                                const indexStr = String(idx + 1).padStart(2, "0");
                                const flightCode =
                                    flight.flightNumber ||
                                    (flight.id
                                        ? `DRP-${flight.id.slice(0, 8).toUpperCase()}`
                                        : "N/A");
                                const timeStr =
                                    formatDateTime(
                                        flight.actualDeparture || flight.scheduledDeparture,
                                        "MMM d, yyyy, h:mm a"
                                    ) || "--";
                                const status: FlightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;

                                return (
                                    <Link
                                        key={flight.id || idx}
                                        href={
                                            flight.id
                                                ? `/dashboard/flights/${flight.id}`
                                                : "/dashboard/flights"
                                        }
                                        className="py-2.5 flex items-center justify-between hover:bg-[var(--color-surface-card)] px-2 rounded transition-colors group cursor-pointer block"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-mono font-bold text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors w-5">
                                                {indexStr}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold font-mono text-[var(--color-text-primary)] group-hover:text-cyan-600 transition-colors truncate">
                                                    {flightCode}
                                                </div>
                                                <div className="text-[11px] font-mono text-[var(--color-text-muted)]">
                                                    {timeStr}
                                                </div>
                                            </div>
                                        </div>

                                        <StatusBadge status={status} showDot={false} />
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="pt-3 border-t border-[var(--color-border-subtle)] mt-2 flex justify-end">
                    <Link
                        href="/dashboard/flights"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        <span>VIEW COMPLETE AUDIT LOGS</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </ChamferCard>
    );
}
