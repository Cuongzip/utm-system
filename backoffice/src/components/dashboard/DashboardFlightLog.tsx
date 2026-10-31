"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/utils/format";
import type { Flight } from "@/types";

export interface DashboardFlightLogProps {
    flights: Flight[];
    isLoading?: boolean;
}

export function DashboardFlightLog({ flights = [], isLoading = false }: DashboardFlightLogProps) {
    const recentFlights = useMemo(() => {
        const getFlightTime = (f: Flight) =>
            new Date(
                f.actualDeparture || f.scheduledDeparture || (f as any).createdOn || 0
            ).getTime();
        return [...flights].sort((a, b) => getFlightTime(b) - getFlightTime(a)).slice(0, 5);
    }, [flights]);

    return (
        <ChamferCard size="lg" className="h-full min-h-[340px]">
            <div className="p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                            <Activity className="h-4 w-4 text-cyan-600" />
                            <span>FLIGHT LOG</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                            {isLoading ? "SYNCING..." : `${recentFlights.length} RECENT ENTRIES`}
                        </span>
                    </div>

                    <div className="mt-3 divide-y divide-slate-100">
                        {isLoading ? (
                            <div className="py-2 space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div
                                        key={i}
                                        className="animate-pulse flex items-center justify-between p-2 rounded bg-slate-50/70"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-5 h-4 bg-slate-200 rounded" />
                                            <div className="space-y-1.5">
                                                <div className="w-24 h-3.5 bg-slate-200 rounded" />
                                                <div className="w-32 h-2.5 bg-slate-100 rounded" />
                                            </div>
                                        </div>
                                        <div className="w-16 h-5 bg-slate-200 rounded-full" />
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
                                        flight.actualDeparture ||
                                            flight.scheduledDeparture ||
                                            (flight as unknown as { createdOn?: string }).createdOn,
                                        "MMM d, yyyy, h:mm a"
                                    ) || "--";
                                const statusStr = (flight.status || "active").toLowerCase();

                                return (
                                    <Link
                                        key={flight.id || idx}
                                        href={
                                            flight.id
                                                ? `/dashboard/flights/${flight.id}`
                                                : "/dashboard/flights"
                                        }
                                        className="py-2.5 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded transition-colors group cursor-pointer block"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-mono font-bold text-slate-400 group-hover:text-slate-600 transition-colors w-5">
                                                {indexStr}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold font-mono text-slate-900 group-hover:text-cyan-600 transition-colors truncate">
                                                    {flightCode}
                                                </div>
                                                <div className="text-[11px] font-mono text-slate-400">
                                                    {timeStr}
                                                </div>
                                            </div>
                                        </div>

                                        <StatusBadge
                                            status={statusStr}
                                            label={statusStr.toUpperCase()}
                                            shape="rounded"
                                        />
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-2 flex justify-end">
                    <Link
                        href="/dashboard/flights"
                        className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <span>VIEW COMPLETE AUDIT LOGS</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </ChamferCard>
    );
}

export default DashboardFlightLog;
