"use client";

import { useLocale, useTranslations } from "next-intl";
import { BatteryCharging, Compass, Gauge, Satellite } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { getCardinalDirectionLabel } from "../routeProgressUtils";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { formatAltitude, formatCoordinates, formatDistance, formatTime } from "@/utils";
import {
    CONFORMANCE_STATUS,
    DEFAULT_FLIGHT_STATUS,
    DRONE_PHYSICS_DEFAULTS,
    type Drone,
    type Flight,
    type FlightConformance,
    type Hub,
    type TelemetryRecord,
} from "@/types";
import type { ReplayDebriefMetrics } from "./useFlightReplayDossierData";

function formatDurationSeconds(sec: number): string {
    const total = Math.max(0, Math.round(sec));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
    if (m > 0) return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
}

interface ReplayTelemetryTabProps {
    flight: Flight;
    drone: Drone | null;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    conformance: FlightConformance | null | undefined;
    activeRecord: TelemetryRecord | null;
    debriefMetrics: ReplayDebriefMetrics;
}

export function ReplayTelemetryTab({
    flight,
    drone,
    departureHub,
    arrivalHub,
    conformance,
    activeRecord,
    debriefMetrics,
}: ReplayTelemetryTabProps) {
    const td = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");
    const locale = useLocale() as AppLocale;

    const flightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;
    const conformanceStatus =
        conformance?.status ?? flight.conformanceStatus ?? CONFORMANCE_STATUS.UNKNOWN;
    const xteM = conformance?.crossTrackErrorM ?? 0;
    const corridorM = conformance?.corridorRadiusM ?? 15;
    const vertErrM = conformance?.verticalErrorM ?? 0;
    const vertBufM = conformance?.altitudeBufferM ?? 10;

    const altMsl = activeRecord?.altitude ?? null;
    const altAgl = activeRecord?.altitudeAgl ?? altMsl;
    const speedMs = activeRecord?.speed ?? null;
    const speedKmh = speedMs != null ? Math.round(speedMs * 3.6) : null;
    const vertSpeed = activeRecord?.verticalSpeed ?? null;
    const heading = activeRecord?.heading != null ? Math.round(activeRecord.heading) : null;
    const pitch = activeRecord?.pitch ?? null;
    const roll = activeRecord?.roll ?? null;
    const batteryPct = activeRecord?.batteryPercentage ?? null;
    const batteryVoltage = activeRecord?.batteryVoltage ?? null;
    const batteryTemp = activeRecord?.batteryTemperature ?? null;
    const powerDrawW =
        activeRecord?.batteryDischargeRate ??
        (speedMs != null && speedMs > 1
            ? (drone?.cruisePowerW ?? DRONE_PHYSICS_DEFAULTS.cruisePowerW)
            : null);

    const modeDisplay = activeRecord?.flightMode
        ? activeRecord.flightMode.replace(/_/g, " ").toUpperCase()
        : (translateStatusLabel(flightStatus, locale) ?? flightStatus.toUpperCase());

    const depCode = departureHub?.code || departureHub?.name || "—";
    const arrCode = arrivalHub?.code || arrivalHub?.name || "—";
    const fullRouteTooltip = `${departureHub?.name || depCode} → ${arrivalHub?.name || arrCode}`;

    return (
        <>
            <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800 truncate">
                        {td("flightSummaryTitle")}
                    </span>
                    <StatusBadge status={conformanceStatus} />
                </div>
                <div className="grid grid-cols-2 gap-px bg-slate-200 font-mono text-[11px]">
                    <div className="bg-white px-3 py-2" title={fullRouteTooltip}>
                        <div className="text-[10px] text-slate-400 uppercase">
                            {td("debriefRoute")}
                        </div>
                        <div className="font-bold text-slate-900 truncate mt-0.5">
                            {depCode} → {arrCode}
                        </div>
                    </div>

                    <div className="bg-white px-3 py-2">
                        <div className="text-[10px] text-slate-400 uppercase">
                            {td("debriefDuration")}
                        </div>
                        <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                            {debriefMetrics.durationSec != null
                                ? formatDurationSeconds(debriefMetrics.durationSec)
                                : "—"}
                        </div>
                    </div>

                    <div className="bg-white px-3 py-2">
                        <div className="text-[10px] text-slate-400 uppercase">
                            {td("debriefDistance")}
                        </div>
                        <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                            {debriefMetrics.trackDistM != null
                                ? formatDistance(debriefMetrics.trackDistM)
                                : "—"}
                        </div>
                    </div>

                    <div className="bg-white px-3 py-2">
                        <div className="text-[10px] text-slate-400 uppercase">
                            {td("debriefPeakAltSpeed")}
                        </div>
                        <div className="font-bold text-slate-900 tabular-nums truncate mt-0.5">
                            {debriefMetrics.peakAltM != null
                                ? `${Math.round(debriefMetrics.peakAltM)}m`
                                : "—"}
                            {" · "}
                            {debriefMetrics.maxSpeedKmh != null
                                ? `${debriefMetrics.maxSpeedKmh} km/h`
                                : "—"}
                        </div>
                    </div>

                    <div className="bg-white px-3 py-2">
                        <div className="text-[10px] text-slate-400 uppercase">
                            {td("debriefBatteryDelta")}
                        </div>
                        <div className="font-bold text-slate-900 tabular-nums truncate mt-0.5">
                            {debriefMetrics.startSoc != null && debriefMetrics.endSoc != null
                                ? `${Math.round(debriefMetrics.startSoc)}% → ${Math.round(debriefMetrics.endSoc)}%`
                                : "—"}
                        </div>
                    </div>

                    <div className="bg-white px-3 py-2">
                        <div className="text-[10px] text-slate-400 uppercase">4D XTE / ΔAlt</div>
                        <div className="font-bold text-slate-900 tabular-nums truncate mt-0.5">
                            {xteM.toFixed(1)}/{Math.round(corridorM)}m · {vertErrM.toFixed(1)}/
                            {Math.round(vertBufM)}m
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-slate-800">
                        {td("frameSnapshotTitle")}
                    </span>
                    <span className="text-slate-500 tabular-nums">
                        {activeRecord?.timestamp ? formatTime(activeRecord.timestamp) : "—"}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-md overflow-hidden">
                    <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                            {td("altShortLabel")}
                        </span>
                        <div>
                            <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                {altMsl != null ? formatAltitude(Math.round(altMsl)) : "—"}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                                {altAgl != null
                                    ? `AGL ${Math.round(altAgl)}m`
                                    : td("planAlt", {
                                          alt: Math.round(flight.cruisingAltitudeM ?? 120),
                                      })}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                            {tCtrl("groundSpeed")}
                        </span>
                        <div>
                            <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                {speedKmh != null ? `${speedKmh} km/h` : "—"}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                                {speedMs != null ? `${speedMs.toFixed(1)} m/s` : "—"}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                                {td("verticalSpeed")}
                            </span>
                            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </div>
                        <div>
                            <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                {vertSpeed != null
                                    ? `${vertSpeed > 0 ? "+" : ""}${vertSpeed.toFixed(1)} m/s`
                                    : "—"}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                                {modeDisplay}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                                {td("headingShortLabel")}
                            </span>
                            <Compass
                                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                style={
                                    heading != null
                                        ? {
                                              transform: `rotate(${heading}deg)`,
                                          }
                                        : undefined
                                }
                            />
                        </div>
                        <div>
                            <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                {heading != null
                                    ? `${String(heading).padStart(3, "0")}° ${getCardinalDirectionLabel(heading)}`
                                    : "—"}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                                {pitch != null || roll != null
                                    ? `P ${pitch != null ? `${pitch.toFixed(1)}°` : "0°"} · R ${roll != null ? `${roll.toFixed(1)}°` : "0°"}`
                                    : "P — · R —"}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white overflow-hidden font-mono">
                <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50/80 flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-800">
                    <BatteryCharging className="w-3.5 h-3.5 text-slate-500" />
                    <span>{td("powerPropulsion")}</span>
                </div>
                <div className="grid grid-cols-4 divide-x divide-slate-200 text-center py-2">
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">{td("soc")}</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                            {batteryPct != null ? `${Math.round(batteryPct)}%` : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">{td("voltage")}</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                            {batteryVoltage != null ? `${batteryVoltage.toFixed(1)}V` : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">{td("temp")}</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                            {batteryTemp != null ? `${batteryTemp.toFixed(0)}°C` : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">{td("load")}</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                            {powerDrawW != null ? `${Math.round(powerDrawW)}W` : "—"}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-md border border-slate-200 bg-white overflow-hidden font-mono text-[11px]">
                <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-bold uppercase text-slate-800">
                        <Satellite className="w-3.5 h-3.5 text-slate-500" />
                        <span>{td("gnssSignalTitle")}</span>
                    </span>
                    <span className="text-slate-600 tabular-nums">
                        {activeRecord?.latitude != null && activeRecord?.longitude != null
                            ? formatCoordinates({
                                  latitude: activeRecord.latitude,
                                  longitude: activeRecord.longitude,
                              })
                            : "—"}
                    </span>
                </div>
                <div className="grid grid-cols-3 divide-x divide-slate-200 text-center py-2">
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">RSSI</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                            {activeRecord?.signalStrength != null
                                ? `${Math.round(activeRecord.signalStrength)}%`
                                : "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">GNSS SATS</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                            {activeRecord?.gpsSatellites ?? "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-[9px] text-slate-400 uppercase">HDOP</div>
                        <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                            {activeRecord?.gpsHdop != null ? activeRecord.gpsHdop.toFixed(1) : "—"}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
