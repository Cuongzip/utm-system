"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, Compass } from "lucide-react";
import { ChamferCard, StatusBadge, Tooltip } from "@/components/ui";
import { isTelemetryFresh, useFlightConformance } from "@/hooks";
import { formatCoordinates } from "@/utils";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { FlightSelectorPopover } from "./FlightSelectorPopover";
import {
    ACTIVE_FLIGHT_STATUSES,
    CONFORMANCE_STATUS,
    DEFAULT_FLIGHT_STATUS,
    FLIGHT_STATUS,
    type Drone,
    type Flight,
    type TelemetryRecord,
} from "@/types";

export interface LiveTelemetryProps {
    telemetry: TelemetryRecord | null;
    flight: Flight | null;
    flights: Flight[];
    drones?: Drone[];
    selectedFlightId: string | null;
    onSelectFlight: (flightId: string) => void;
    telemetryMap: Record<string, TelemetryRecord>;
}

function getCardinalDirection(deg: number): string {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const normalized = ((deg % 360) + 360) % 360;
    return dirs[Math.round(normalized / 45) % 8];
}

export function LiveTelemetry({
    telemetry,
    flight,
    flights = [],
    drones = [],
    selectedFlightId,
    onSelectFlight,
    telemetryMap = {},
}: LiveTelemetryProps) {
    const t = useTranslations("controlCenter");
    const locale = useLocale() as AppLocale;
    const [isFlightListOpen, setIsFlightListOpen] = useState(false);
    const { data: conformance } = useFlightConformance(flight?.id, Boolean(flight?.id));

    const droneRegMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const d of drones) {
            if (d.id) {
                map.set(d.id, d.registrationNumber || d.model || "UAV");
            }
        }
        return map;
    }, [drones]);

    const isAirborne = Boolean(flight?.status && ACTIVE_FLIGHT_STATUSES.includes(flight.status));
    const isFresh = isAirborne && isTelemetryFresh(telemetry);
    const linkBadgeStatus = isFresh
        ? "live"
        : flight?.status === FLIGHT_STATUS.AUTHORIZED
          ? "standby"
          : "offline";
    const altitudeMeters = telemetry?.altitude != null ? Math.round(telemetry.altitude) : null;
    const speedKmh = telemetry?.speed != null ? Math.round(telemetry.speed * 3.6) : null;
    const batteryPercent =
        telemetry?.batteryPercentage != null ? Math.round(telemetry.batteryPercentage) : null;
    const headingDegrees = telemetry?.heading != null ? Math.round(telemetry.heading) : null;
    const hasAlert = batteryPercent != null && batteryPercent < 20;

    const activeDroneId = telemetry?.droneId || flight?.droneId;
    const droneRegistration = activeDroneId
        ? droneRegMap.get(activeDroneId) || t("assignedUav")
        : "—";
    const uavId =
        flight?.flightNumber ||
        (activeDroneId ? droneRegistration : translateStatusLabel("standby", locale) || "STANDBY");

    const rawStatus = flight?.status ?? DEFAULT_FLIGHT_STATUS;
    const autopilotMode =
        isFresh && telemetry?.flightMode
            ? telemetry.flightMode.replace(/_/g, " ").toUpperCase()
            : null;
    const flightModeLabel =
        autopilotMode ??
        translateStatusLabel(rawStatus, locale) ??
        rawStatus.replace(/_/g, " ").toUpperCase();
    const conformanceState =
        conformance?.status ?? flight?.conformanceStatus ?? CONFORMANCE_STATUS.UNKNOWN;
    const corridorTooltip =
        conformance?.crossTrackErrorM != null || conformance?.verticalErrorM != null
            ? t("corridorTooltip", {
                  lat: Math.round(conformance.crossTrackErrorM ?? 0),
                  vert: Math.round(conformance.verticalErrorM ?? 0),
              })
            : undefined;

    const positionStr =
        telemetry?.latitude != null && telemetry?.longitude != null
            ? formatCoordinates({ latitude: telemetry.latitude, longitude: telemetry.longitude })
            : t("awaitingFix");

    const batteryColorClass =
        batteryPercent == null
            ? "text-slate-400"
            : batteryPercent < 20
              ? "text-red-600"
              : batteryPercent <= 40
                ? "text-amber-600"
                : "text-slate-900";

    const batteryBarClass =
        batteryPercent == null
            ? "bg-slate-200"
            : batteryPercent < 20
              ? "bg-red-600"
              : batteryPercent <= 40
                ? "bg-amber-500"
                : "bg-slate-800";

    return (
        <ChamferCard size="lg" className="h-[520px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                        <span className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                            {t("liveTelemetry")}
                        </span>
                        <div className="flex items-center gap-2">
                            {flight?.id && (
                                <Link
                                    href={`/dashboard/flights/${flight.id}/cockpit`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[10px] font-mono font-bold uppercase text-slate-800 transition-colors no-underline"
                                >
                                    <span>{t("openFlightDeck")}</span>
                                    <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                                </Link>
                            )}
                            <StatusBadge status={linkBadgeStatus} />
                        </div>
                    </div>

                    <FlightSelectorPopover
                        isOpen={isFlightListOpen}
                        onOpenChange={setIsFlightListOpen}
                        flight={flight}
                        flights={flights}
                        droneRegMap={droneRegMap}
                        selectedFlightId={selectedFlightId}
                        onSelectFlight={onSelectFlight}
                        telemetryMap={telemetryMap}
                        hasAlert={hasAlert}
                        droneRegistration={droneRegistration}
                        uavId={uavId}
                    />

                    <div className="grid grid-cols-2 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                {t("altitudeAgl")}
                            </span>
                            <div>
                                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                                    {altitudeMeters != null ? `${altitudeMeters} m` : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                    {flight?.maxAltitudeM != null
                                        ? t("ceilingM", { alt: Math.round(flight.maxAltitudeM) })
                                        : t("barometricGnss")}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                {t("groundSpeed")}
                            </span>
                            <div>
                                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                                    {speedKmh != null ? `${speedKmh} km/h` : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                    {telemetry?.speed != null
                                        ? `${telemetry.speed.toFixed(1)} m/s`
                                        : "—"}
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                {t("batteryPack")}
                            </span>
                            <div>
                                <div
                                    className={`font-mono text-2xl font-bold tabular-nums leading-tight ${batteryColorClass}`}
                                >
                                    {batteryPercent != null ? `${batteryPercent}%` : "—"}
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
                                    <div
                                        className={`h-full transition-[width] duration-300 ${batteryBarClass}`}
                                        style={{
                                            width: `${Math.min(100, Math.max(0, batteryPercent ?? 0))}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-[var(--color-surface-panel)] p-4 flex flex-col justify-between min-h-[126px]">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                    {t("heading")}
                                </span>
                                {headingDegrees != null && (
                                    <Compass
                                        className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300"
                                        style={{ transform: `rotate(${headingDegrees}deg)` }}
                                        aria-hidden="true"
                                    />
                                )}
                            </div>
                            <div>
                                <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums leading-tight">
                                    {headingDegrees != null ? `${headingDegrees}°` : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 mt-1">
                                    {headingDegrees != null
                                        ? t("courseDir", {
                                              dir: getCardinalDirection(headingDegrees),
                                          })
                                        : "—"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs font-mono">
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            {t("mode")}
                        </span>
                        <span
                            className="text-[11px] font-bold text-slate-900 block mt-0.5 truncate"
                            title={flightModeLabel}
                        >
                            {flightModeLabel}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            {t("corridor")}
                        </span>
                        <div className="mt-0.5 flex items-center h-[18px]">
                            <Tooltip content={corridorTooltip} side="top">
                                <span>
                                    <StatusBadge status={conformanceState} />
                                </span>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            {t("position")}
                        </span>
                        <span
                            className="text-[11px] text-slate-700 font-semibold block mt-0.5 truncate tabular-nums"
                            title={positionStr}
                        >
                            {positionStr}
                        </span>
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}
