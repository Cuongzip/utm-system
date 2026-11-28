"use client";

import { useState, useMemo, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { connectivityService } from "@/services";
import {
    QUERY_KEYS,
    useConnectivityDevices,
    useDeviceTelemetryMode,
    useHubWeatherGoNoGo,
} from "@/hooks";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import {
    ACTIVE_FLIGHT_STATUSES,
    CONFORMANCE_STATUS,
    DEFAULT_FLIGHT_STATUS,
    DRONE_PHYSICS_DEFAULTS,
    type Drone,
    type Flight,
    type FlightConformance,
    type Hub,
    type TelemetryMode,
    type TelemetryRecord,
} from "@/types";

export const MODE_HZ_LABELS: Record<TelemetryMode, string> = {
    idle: "0.2 Hz",
    normal: "1 Hz",
    enhanced: "5 Hz",
    emergency: "10 Hz",
};

export function formatElapsedClock(sec: number): string {
    const clamped = Math.max(0, Math.floor(sec));
    const h = Math.floor(clamped / 3600);
    const m = Math.floor((clamped % 3600) / 60);
    const s = clamped % 60;
    if (h > 0) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface UseCockpitHudMetricsParams {
    flight: Flight;
    drone: Drone | null;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    telemetry: TelemetryRecord | null;
    conformance?: FlightConformance | null;
}

export function useCockpitHudMetrics({
    flight,
    drone,
    departureHub,
    arrivalHub,
    telemetry,
    conformance,
}: UseCockpitHudMetricsParams) {
    const t = useTranslations("flights.deck");
    const locale = useLocale() as AppLocale;
    const queryClient = useQueryClient();

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

    return {
        elapsedSeconds,
        arrivalGoNoGo,
        linkedDevice,
        setRateMutation,
        altMsl,
        altAgl,
        speedMs,
        speedKmh,
        vertSpeed,
        heading,
        pitch,
        roll,
        batteryPct,
        batteryVoltage,
        batteryTemp,
        powerDrawW,
        remainingMinutes,
        phaseLabel,
        activeTelemetryMode,
        conformanceStatus,
        xteM,
        corridorM,
        vertErrM,
        vertBufM,
        depCode,
        arrCode,
    };
}
