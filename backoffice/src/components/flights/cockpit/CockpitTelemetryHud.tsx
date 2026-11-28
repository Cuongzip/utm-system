"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Compass,
    BatteryCharging,
    CloudSun,
    ChevronDown,
    ChevronUp,
    Gauge,
    Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui";
import { connectivityService } from "@/services";
import {
    QUERY_KEYS,
    useConnectivityDevices,
    useDeviceTelemetryMode,
    useHubWeatherGoNoGo,
} from "@/hooks";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { cn } from "@/lib";
import { formatAltitude, formatCoordinates, formatDistance, localizeServerText } from "@/utils";
import { getCardinalDirectionLabel, type LegEtaProgress } from "../routeProgressUtils";
import {
    ACTIVE_FLIGHT_STATUSES,
    CONFORMANCE_STATUS,
    DEFAULT_FLIGHT_STATUS,
    DRONE_PHYSICS_DEFAULTS,
    TELEMETRY_MODES,
    type Drone,
    type Flight,
    type FlightConformance,
    type Hub,
    type TelemetryMode,
    type TelemetryRecord,
} from "@/types";

export interface CockpitTelemetryHudProps {
    flight: Flight;
    drone: Drone | null;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    telemetry: TelemetryRecord | null;
    conformance?: FlightConformance | null;
    legProgress: LegEtaProgress | null;
}

const MODE_HZ_LABELS: Record<TelemetryMode, string> = {
    idle: "0.2 Hz",
    normal: "1 Hz",
    enhanced: "5 Hz",
    emergency: "10 Hz",
};

function formatElapsedClock(sec: number): string {
    const clamped = Math.max(0, Math.floor(sec));
    const h = Math.floor(clamped / 3600);
    const m = Math.floor((clamped % 3600) / 60);
    const s = clamped % 60;
    if (h > 0) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function CockpitTelemetryHud({
    flight,
    drone,
    departureHub,
    arrivalHub,
    telemetry,
    conformance,
    legProgress,
}: CockpitTelemetryHudProps) {
    const t = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");
    const locale = useLocale() as AppLocale;
    const queryClient = useQueryClient();
    const [collapsed, setCollapsed] = useState(false);

    const isAirborneStatus = Boolean(
        flight.status && ACTIVE_FLIGHT_STATUSES.includes(flight.status)
    );

    const [nowMs, setNowMs] = useState<number>(() => Date.now());
    useEffect(() => {
        if (!isAirborneStatus || !flight.actualDeparture) return;
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [isAirborneStatus, flight.actualDeparture]);

    const elapsedSeconds = useMemo(() => {
        if (!flight.actualDeparture) return null;
        const startMs = Date.parse(flight.actualDeparture);
        if (Number.isNaN(startMs)) return null;
        const endMs = flight.actualArrival ? Date.parse(flight.actualArrival) : nowMs;
        if (Number.isNaN(endMs)) return null;
        return Math.max(0, Math.floor((endMs - startMs) / 1000));
    }, [flight.actualDeparture, flight.actualArrival, nowMs]);

    const { data: devices = [] } = useConnectivityDevices();
    const { data: arrivalGoNoGo } = useHubWeatherGoNoGo(
        flight.arrivalHubId,
        Boolean(flight.arrivalHubId)
    );

    const linkedDevice = useMemo(() => {
        if (drone?.deviceRegistration?.id) {
            return {
                id: drone.deviceRegistration.id,
                deviceIdentifier: drone.deviceRegistration.deviceIdentifier,
            };
        }
        if (!flight.droneId) return null;
        return devices.find((d) => d.droneId === flight.droneId) ?? null;
    }, [drone, devices, flight.droneId]);

    const { data: deviceModeData } = useDeviceTelemetryMode(
        linkedDevice?.id ?? null,
        Boolean(linkedDevice?.id)
    );

    const setRateMutation = useMutation({
        mutationFn: (mode: TelemetryMode) => {
            if (!linkedDevice?.id) throw new Error(t("noDeviceLinked"));
            return connectivityService.setDeviceTelemetryMode(linkedDevice.id, { mode });
        },
        onSuccess: (_res, mode) => {
            if (linkedDevice?.id) {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.connectivityDeviceMode(linkedDevice.id),
                });
            }
            toast.success(t("rateUpdatedToast", { rate: MODE_HZ_LABELS[mode] }));
        },
        meta: { defaultErrorMessage: t("rateUpdateFailed") },
    });

    const altMsl = telemetry?.altitude ?? null;
    const altAgl = telemetry?.altitudeAgl ?? altMsl;
    const speedMs = telemetry?.speed ?? null;
    const speedKmh = speedMs != null ? Math.round(speedMs * 3.6) : null;
    const vertSpeed = telemetry?.verticalSpeed ?? null;
    const heading = telemetry?.heading != null ? Math.round(telemetry.heading) : null;
    const pitch = telemetry?.pitch ?? null;
    const roll = telemetry?.roll ?? null;

    const batteryPct = telemetry?.batteryPercentage ?? drone?.currentBatteryPct ?? null;
    const batteryVoltage = telemetry?.batteryVoltage ?? null;
    const batteryTemp = telemetry?.batteryTemperature ?? null;
    const powerDrawW =
        telemetry?.batteryDischargeRate ??
        (speedMs != null && speedMs > 1
            ? (drone?.cruisePowerW ?? DRONE_PHYSICS_DEFAULTS.cruisePowerW)
            : altMsl != null && altMsl > 1
              ? (drone?.hoverPowerW ?? DRONE_PHYSICS_DEFAULTS.hoverPowerW)
              : null);

    const remainingMinutes = useMemo(() => {
        if (!isAirborneStatus && powerDrawW == null) return null;
        if (batteryPct == null || batteryPct <= 0) return null;
        const capWh = drone?.batteryCapacityWh ?? DRONE_PHYSICS_DEFAULTS.batteryCapacityWh;
        const health = (drone?.batteryHealthPct ?? 100) / 100;
        const usableWh = capWh * health * (Math.max(0, batteryPct - 10) / 100);
        const drawW =
            powerDrawW && powerDrawW > 20
                ? powerDrawW
                : (drone?.cruisePowerW ?? DRONE_PHYSICS_DEFAULTS.cruisePowerW);
        if (drawW <= 0) return null;
        return Math.max(0, Math.round((usableWh / drawW) * 60));
    }, [isAirborneStatus, batteryPct, drone, powerDrawW]);

    const rawFlightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;
    const rawModeUpper = (telemetry?.flightMode ?? "").toUpperCase();
    const phaseLabel = useMemo(() => {
        if (rawModeUpper === "TAKEOFF") return t("phaseTakeoff");
        if (rawModeUpper === "LANDING" || rawModeUpper === "LANDED") return t("phaseLanding");
        if (rawModeUpper === "LOITER") return t("phaseLoiter");
        if (rawModeUpper === "RTL" || rawModeUpper === "DIVERT") return t("phaseRtl");
        if (rawModeUpper === "AUTONOMOUS" || rawModeUpper === "ALTITUDE_CHANGE") {
            return t("phaseCruise");
        }
        if (!isAirborneStatus) return t("phasePreflight");
        return translateStatusLabel(rawFlightStatus, locale) ?? rawFlightStatus.toUpperCase();
    }, [rawModeUpper, isAirborneStatus, rawFlightStatus, locale, t]);

    const activeTelemetryMode = (deviceModeData?.telemetryMode ?? "normal") as TelemetryMode;
    const conformanceStatus =
        conformance?.status ?? flight.conformanceStatus ?? CONFORMANCE_STATUS.UNKNOWN;
    const xteM = conformance?.crossTrackErrorM ?? 0;
    const corridorM = conformance?.corridorRadiusM ?? 15;
    const vertErrM = conformance?.verticalErrorM ?? 0;
    const vertBufM = conformance?.altitudeBufferM ?? 10;

    const depCode = departureHub?.code || departureHub?.name;
    const arrCode = arrivalHub?.code || arrivalHub?.name;

    return (
        <aside
            aria-label={t("hudInstrumentsTitle")}
            className="absolute top-24 sm:top-3.5 left-3.5 z-30 w-[calc(100vw-1.75rem)] sm:w-72 max-h-[calc(100%-11rem)] sm:max-h-[calc(100%-6.5rem)] flex flex-col rounded-md border border-slate-700/85 bg-slate-900/92 text-slate-100 shadow-2xl backdrop-blur-md overflow-hidden pointer-events-auto"
        >
            <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-slate-700/80 shrink-0">
                <div className="min-w-0 flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-200 whitespace-nowrap">
                        {t("hudInstrumentsTitle")}
                    </span>
                    {collapsed && (
                        <span className="font-mono text-[11px] text-emerald-400 tabular-nums truncate">
                            {altMsl != null ? `${Math.round(altMsl)}m` : "—"} ·{" "}
                            {speedKmh != null ? `${speedKmh}km/h` : "—"} ·{" "}
                            {batteryPct != null ? `${Math.round(batteryPct)}%` : "—"}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {!collapsed && elapsedSeconds != null && (
                        <span className="font-mono text-[10px] font-bold text-emerald-400 tabular-nums">
                            T+{formatElapsedClock(elapsedSeconds)}
                        </span>
                    )}
                    <button
                        type="button"
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? t("expandHud") : t("collapseHud")}
                        onClick={() => setCollapsed((prev) => !prev)}
                        className="w-6 h-6 rounded hover:bg-slate-800 inline-flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        {collapsed ? (
                            <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                        ) : (
                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="divide-y divide-slate-700/80 text-xs overflow-y-auto utm-scroll min-h-0">
                    <div className="px-3 py-1.5 bg-slate-800/60 flex items-center justify-between gap-2 font-mono text-[10px]">
                        <span className="font-bold uppercase tracking-wider text-emerald-400 truncate">
                            {phaseLabel}
                        </span>
                        {depCode && arrCode && (
                            <span className="text-slate-300 truncate">
                                {depCode} → {arrCode}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-px bg-slate-700/75">
                        <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                                {t("altShortLabel")}
                            </span>
                            <div>
                                <div className="font-mono text-base font-bold text-white tabular-nums">
                                    {altMsl != null ? formatAltitude(Math.round(altMsl)) : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                                    {altAgl != null
                                        ? `AGL ${Math.round(altAgl)}m · ${t("planAlt", { alt: Math.round(flight.cruisingAltitudeM ?? 120) })}`
                                        : t("planAlt", {
                                              alt: Math.round(flight.cruisingAltitudeM ?? 120),
                                          })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                                {tCtrl("groundSpeed")}
                            </span>
                            <div>
                                <div className="font-mono text-base font-bold text-white tabular-nums">
                                    {speedKmh != null ? `${speedKmh} km/h` : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                                    {speedMs != null ? `${speedMs.toFixed(1)} m/s` : "—"}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                                    {t("verticalSpeed")}
                                </span>
                                <Gauge
                                    className="w-3 h-3 text-slate-500 shrink-0"
                                    aria-hidden="true"
                                />
                            </div>
                            <div>
                                <div
                                    className={cn(
                                        "font-mono text-base font-bold tabular-nums",
                                        vertSpeed != null && vertSpeed <= -5
                                            ? "text-red-400"
                                            : "text-white"
                                    )}
                                >
                                    {vertSpeed != null
                                        ? `${vertSpeed > 0 ? "+" : ""}${vertSpeed.toFixed(1)} m/s`
                                        : "—"}
                                </div>
                                <div className="text-[10px] font-mono text-slate-400 truncate">
                                    {telemetry?.flightMode
                                        ? telemetry.flightMode.replace(/_/g, " ")
                                        : "—"}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900/95 p-2.5 flex flex-col justify-between min-h-[70px]">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap truncate">
                                    {t("headingShortLabel")}
                                </span>
                                <Compass
                                    className="w-3.5 h-3.5 text-slate-400 transition-transform duration-300 shrink-0"
                                    style={
                                        heading != null
                                            ? { transform: `rotate(${heading}deg)` }
                                            : undefined
                                    }
                                    aria-hidden="true"
                                />
                            </div>
                            <div>
                                <div className="font-mono text-base font-bold text-white tabular-nums">
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

                    {legProgress && (
                        <div className="px-3 py-2 space-y-1.5 font-mono text-[10px]">
                            <div className="flex items-center justify-between gap-2 text-slate-300">
                                <span className="inline-flex items-center gap-1 truncate">
                                    <Navigation
                                        className="w-3 h-3 text-slate-400 shrink-0"
                                        aria-hidden="true"
                                    />
                                    <span className="truncate">
                                        {t("nextPoint")}: {legProgress.nextLabel} (
                                        {formatDistance(legProgress.distToNextM)})
                                    </span>
                                </span>
                                <span className="text-slate-400 tabular-nums shrink-0">
                                    {legProgress.etaMinutes != null
                                        ? `ETA ~${legProgress.etaMinutes}m`
                                        : `${legProgress.progressPct}%`}
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${legProgress.progressPct}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="lg:hidden px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px]">
                        <StatusBadge status={conformanceStatus} tone="dark" />
                        <span className="text-slate-300 tabular-nums">
                            XTE {xteM.toFixed(1)}/{Math.round(corridorM)}m · ΔAlt{" "}
                            {vertErrM.toFixed(1)}/{Math.round(vertBufM)}m
                        </span>
                    </div>

                    <div className="p-2.5 space-y-2">
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                            <span className="inline-flex items-center gap-1.5 font-bold uppercase text-slate-300">
                                <BatteryCharging
                                    className="w-3.5 h-3.5 text-slate-400"
                                    aria-hidden="true"
                                />
                                <span>{t("powerPropulsion")}</span>
                            </span>
                            {remainingMinutes != null && (
                                <span className="text-slate-400 tabular-nums">
                                    ~{remainingMinutes} {t("minRemaining")}
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-4 divide-x divide-slate-700/80 text-center bg-slate-800/70 rounded py-1.5 border border-slate-700/80 font-mono">
                            <div className="px-1">
                                <div className="text-[9px] text-slate-400 uppercase">
                                    {t("soc")}
                                </div>
                                <div
                                    className={cn(
                                        "text-xs font-bold tabular-nums mt-0.5",
                                        batteryPct != null && batteryPct < 20
                                            ? "text-red-400"
                                            : batteryPct != null && batteryPct <= 35
                                              ? "text-amber-400"
                                              : "text-white"
                                    )}
                                >
                                    {batteryPct != null ? `${Math.round(batteryPct)}%` : "—"}
                                </div>
                            </div>
                            <div className="px-1">
                                <div className="text-[9px] text-slate-400 uppercase">
                                    {t("voltage")}
                                </div>
                                <div className="text-xs font-bold text-white tabular-nums mt-0.5">
                                    {batteryVoltage != null ? `${batteryVoltage.toFixed(1)}V` : "—"}
                                </div>
                            </div>
                            <div className="px-1">
                                <div className="text-[9px] text-slate-400 uppercase">
                                    {t("temp")}
                                </div>
                                <div className="text-xs font-bold text-white tabular-nums mt-0.5">
                                    {batteryTemp != null ? `${batteryTemp.toFixed(0)}°C` : "—"}
                                </div>
                            </div>
                            <div className="px-1">
                                <div className="text-[9px] text-slate-400 uppercase">
                                    {t("load")}
                                </div>
                                <div className="text-xs font-bold text-white tabular-nums mt-0.5">
                                    {powerDrawW != null ? `${Math.round(powerDrawW)}W` : "—"}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                                <span>{t("telemetryRate")}</span>
                                <span className="truncate max-w-[135px] tabular-nums">
                                    {telemetry?.latitude != null && telemetry?.longitude != null
                                        ? formatCoordinates({
                                              latitude: telemetry.latitude,
                                              longitude: telemetry.longitude,
                                          })
                                        : (linkedDevice?.deviceIdentifier ?? t("simulatedLink"))}
                                </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                                {TELEMETRY_MODES.map((m) => {
                                    const selected = activeTelemetryMode === m;
                                    const disabled = !linkedDevice?.id || setRateMutation.isPending;
                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => setRateMutation.mutate(m)}
                                            title={!linkedDevice?.id ? t("noDeviceLinked") : m}
                                            className={cn(
                                                "h-6 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                                selected
                                                    ? "bg-slate-200 text-slate-900"
                                                    : "border border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white"
                                            )}
                                        >
                                            {MODE_HZ_LABELS[m]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {arrivalHub && (
                        <div className="px-2.5 py-2 flex items-center justify-between gap-2 font-mono text-[11px]">
                            <span className="inline-flex items-center gap-1.5 text-slate-300 truncate">
                                <CloudSun
                                    className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="truncate">
                                    {arrivalHub.code || arrivalHub.name}
                                    {arrivalGoNoGo?.windSpeedMs != null
                                        ? ` · ${arrivalGoNoGo.windSpeedMs.toFixed(1)}m/s`
                                        : ""}
                                </span>
                            </span>
                            {arrivalGoNoGo?.verdict ? (
                                <span
                                    title={
                                        arrivalGoNoGo.reasons?.[0]
                                            ? localizeServerText(arrivalGoNoGo.reasons[0], locale)
                                            : undefined
                                    }
                                >
                                    <StatusBadge
                                        status={arrivalGoNoGo.verdict.toLowerCase()}
                                        tone="dark"
                                    />
                                </span>
                            ) : (
                                <span className="text-[10px] text-slate-500">METAR —</span>
                            )}
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
}
