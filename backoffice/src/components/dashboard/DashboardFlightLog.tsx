"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import { compareCreatedDesc, formatDateTime } from "@/utils";
import {
    ACTIVE_FLIGHT_STATUSES,
    DEFAULT_FLIGHT_STATUS,
    type Flight,
    type FlightStatus,
    type Hub,
} from "@/types";

interface DashboardFlightLogProps {
    flights: Flight[];
    hubs?: Hub[];
    isLoading: boolean;
}

export function DashboardFlightLog({
    flights = [],
    hubs = [],
    isLoading = false,
}: DashboardFlightLogProps) {
    const t = useTranslations("dashboard");
    const tc = useTranslations("common");

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
        <ChamferCard size="md" className="w-full">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono uppercase tracking-wider truncate">
                        {t("recentFlights")}
                    </span>
                    {!isLoading && flights.length > 0 && (
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)] shrink-0">
                            {t("ofTotalFlights", {
                                shown: recentFlights.length,
                                total: flights.length,
                            })}
                        </span>
                    )}
                </div>
                <Link
                    href="/dashboard/flights"
                    className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded px-1 shrink-0"
                >
                    <span>{tc("viewAll")}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
            </div>

            {isLoading ? (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Skeleton className="h-3.5 w-28" />
                                <Skeleton className="h-3 w-36" />
                            </div>
                            <Skeleton className="h-5 w-16" />
                        </div>
                    ))}
                </div>
            ) : recentFlights.length === 0 ? (
                <EmptyState compact title={t("noRecentFlights")} />
            ) : (
                <div className="divide-y divide-[var(--color-border-subtle)]">
                    {recentFlights.map((flight, idx) => {
                        const flightCode = flight.flightNumber || t("unnumberedFlight");
                        const depLabel = flight.departureHubId
                            ? hubCodeMap.get(flight.departureHubId)
                            : null;
                        const arrLabel = flight.arrivalHubId
                            ? hubCodeMap.get(flight.arrivalHubId)
                            : null;
                        const routeLabel =
                            depLabel && arrLabel ? `${depLabel} → ${arrLabel}` : null;
                        const rawDate =
                            flight.createdOn || flight.actualDeparture || flight.scheduledDeparture;
                        const timeStr = rawDate
                            ? formatDateTime(rawDate, "MMM d · HH:mm")
                            : tc("unscheduled");
                        const status: FlightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;

                        const isAirborne = ACTIVE_FLIGHT_STATUSES.includes(status);

                        return (
                            <Link
                                key={flight.id || idx}
                                href={
                                    flight.id
                                        ? isAirborne
                                            ? `/dashboard/flights/${flight.id}/cockpit`
                                            : `/dashboard/flights/${flight.id}`
                                        : "/dashboard/flights"
                                }
                                className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-subtle)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400"
                            >
                                <div className="min-w-0">
                                    <div className="text-xs font-bold font-mono text-[var(--color-text-primary)] truncate">
                                        {flightCode}
                                    </div>
                                    <div className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                                        {routeLabel ? `${routeLabel} · ${timeStr}` : timeStr}
                                    </div>
                                </div>

                                <StatusBadge status={status} showDot />
                            </Link>
                        );
                    })}
                </div>
            )}
        </ChamferCard>
    );
}
