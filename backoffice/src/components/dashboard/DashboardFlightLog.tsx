"use client";

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/utils/format";
import type { Flight } from "@/types";

export interface DashboardFlightLogProps {
    flights: Flight[];
}

export function DashboardFlightLog({ flights = [] }: DashboardFlightLogProps) {
    const recentFlights = flights.slice(0, 5);

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
                            {recentFlights.length} RECENT ENTRIES
                        </span>
                    </div>

                    <div className="mt-3 divide-y divide-slate-100">
                        {recentFlights.length === 0 ? (
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
                                    <div
                                        key={flight.id || idx}
                                        className="py-2.5 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded transition-colors"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-mono font-bold text-slate-400 w-5">
                                                {indexStr}
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold font-mono text-slate-900 truncate">
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
                                    </div>
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
