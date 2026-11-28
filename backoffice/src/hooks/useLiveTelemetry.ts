"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { telemetryService, ApiError } from "@/services";
import { useStomp, useTelemetryStream } from "./useStomp";
import { ACTIVE_FLIGHT_STATUSES, type Flight, type TelemetryRecord } from "@/types";

const POLL_INTERVAL_MS = 1000;
const DEFAULT_FRESH_TELEMETRY_MS = 15000;

export function isTelemetryFresh(
    record?: TelemetryRecord | null,
    maxAgeMs = DEFAULT_FRESH_TELEMETRY_MS
): boolean {
    if (!record?.timestamp) return false;
    const ts = Date.parse(record.timestamp);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts <= maxAgeMs;
}

export function useLiveTelemetry(flights: Flight[]) {
    const [telemetryMap, setTelemetryMap] = useState<Record<string, TelemetryRecord>>({});
    const isPollingRef = useRef(false);

    const airborneFlights = useMemo(
        () => flights.filter((f) => f.status && ACTIVE_FLIGHT_STATUSES.includes(f.status)),
        [flights]
    );
    const hasAirborneFlights = airborneFlights.length > 0;
    const { isConnected: isSocketConnected } = useStomp({ autoConnect: hasAirborneFlights });

    const handleIncomingTelemetry = useCallback(
        (record: TelemetryRecord) => {
            if (!record) return;

            let targetFlightId = record.flightId;
            if (!targetFlightId && record.droneId) {
                const matched = airborneFlights.find((f) => f.droneId === record.droneId);
                if (matched) {
                    targetFlightId = matched.id;
                }
            }

            if (!targetFlightId) return;

            setTelemetryMap((prev) => ({
                ...prev,
                [targetFlightId!]: record,
            }));
        },
        [airborneFlights]
    );

    useTelemetryStream(handleIncomingTelemetry, undefined, hasAirborneFlights);

    useEffect(() => {
        if (airborneFlights.length === 0) return;

        let alive = true;

        const pollTelemetry = async () => {
            if (isPollingRef.current) return;
            isPollingRef.current = true;

            try {
                const promises = airborneFlights.map(async (flight) => {
                    const latest = await telemetryService
                        .getLatestByFlightId(flight.id)
                        .catch((err) =>
                            err instanceof ApiError && err.status === 404
                                ? null
                                : Promise.reject(err)
                        );

                    if (!latest && flight.droneId) {
                        const droneLatest = await telemetryService
                            .getLatestByDroneId(flight.droneId)
                            .catch((err) =>
                                err instanceof ApiError && err.status === 404
                                    ? null
                                    : Promise.reject(err)
                            );
                        if (
                            droneLatest &&
                            (!droneLatest.flightId || droneLatest.flightId === flight.id) &&
                            isTelemetryFresh(droneLatest, 30000)
                        ) {
                            return {
                                flightId: flight.id,
                                latest: droneLatest,
                            };
                        }
                        return { flightId: flight.id, latest: null };
                    }
                    return { flightId: flight.id, latest };
                });

                const results = await Promise.all(promises);
                if (!alive) return;

                const newTelemetryMap: Record<string, TelemetryRecord> = {};

                results.forEach(({ flightId, latest }) => {
                    if (latest) {
                        newTelemetryMap[flightId] = latest;
                    }
                });

                setTelemetryMap((prev) => ({ ...prev, ...newTelemetryMap }));
            } catch (err) {
                console.error("Error polling telemetry records:", err);
            } finally {
                isPollingRef.current = false;
            }
        };

        pollTelemetry();

        const activeInterval = isSocketConnected ? 5000 : POLL_INTERVAL_MS;
        const intervalId = setInterval(pollTelemetry, activeInterval);

        return () => {
            alive = false;
            clearInterval(intervalId);
        };
    }, [airborneFlights, isSocketConnected]);

    const activeTelemetryCount = Object.keys(telemetryMap).length;

    return {
        telemetryMap,
        isSocketConnected,
        activeTelemetryCount,
    };
}
