"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { telemetryService, ApiError } from "@/services";
import { useStomp, useTelemetryStream } from "./useStomp";
import type { Flight, TelemetryRecord } from "@/types";

const POLL_INTERVAL_MS = 1000;

export function useLiveTelemetry(flights: Flight[]) {
    const [telemetryMap, setTelemetryMap] = useState<Record<string, TelemetryRecord>>({});
    const isPollingRef = useRef(false);
    const { isConnected: isSocketConnected } = useStomp();

    const handleIncomingTelemetry = useCallback(
        (record: TelemetryRecord) => {
            if (!record) return;

            let targetFlightId = record.flightId;
            if (!targetFlightId && record.droneId) {
                const matched = flights.find((f) => f.droneId === record.droneId);
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
        [flights]
    );

    useTelemetryStream(handleIncomingTelemetry);

    useEffect(() => {
        if (flights.length === 0) return;

        let alive = true;

        const pollTelemetry = async () => {
            if (isPollingRef.current) return;
            isPollingRef.current = true;

            try {
                const promises = flights.map(async (flight) => {
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
                        return {
                            flightId: flight.id,
                            latest: droneLatest,
                        };
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

        const activeInterval = isSocketConnected ? 10000 : POLL_INTERVAL_MS;
        const intervalId = setInterval(pollTelemetry, activeInterval);

        return () => {
            alive = false;
            clearInterval(intervalId);
        };
    }, [flights, isSocketConnected]);

    const activeTelemetryCount = Object.keys(telemetryMap).length;

    return {
        telemetryMap,
        isSocketConnected,
        activeTelemetryCount,
    };
}
