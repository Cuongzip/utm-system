"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { telemetryService } from "@/services";
import { useStomp, useTelemetryStream } from "./useStomp";
import type { Flight, TelemetryRecord } from "@/types";

interface UseLiveTelemetryOptions {
    intervalMs?: number;
    enabled?: boolean;
}

export function useLiveTelemetry(flights: Flight[], options: UseLiveTelemetryOptions = {}) {
    const { intervalMs = 1000, enabled = true } = options;
    const [telemetryMap, setTelemetryMap] = useState<Record<string, TelemetryRecord>>({});
    const [telemetryHistoryMap, setTelemetryHistoryMap] = useState<
        Record<string, TelemetryRecord[]>
    >({});
    const [isPolling, setIsPolling] = useState(false);
    const isPollingRef = useRef(false);
    const { isConnected: isSocketConnected } = useStomp({ autoConnect: enabled });

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

            setTelemetryHistoryMap((prev) => {
                const existing = prev[targetFlightId!] || [];
                const updated = [...existing.slice(-99), record];
                return {
                    ...prev,
                    [targetFlightId!]: updated,
                };
            });
        },
        [flights]
    );

    useTelemetryStream(handleIncomingTelemetry, null, enabled);

    useEffect(() => {
        if (!enabled || flights.length === 0) return;

        let alive = true;

        const pollTelemetry = async () => {
            if (isPollingRef.current) return;
            isPollingRef.current = true;
            setIsPolling(true);

            try {
                const promises = flights.map(async (flight) => {
                    const latest = await telemetryService.getLatestByFlightId(flight.id);
                    if (!latest && flight.droneId) {
                        return {
                            flightId: flight.id,
                            latest: await telemetryService.getLatestByDroneId(flight.droneId),
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
                if (alive) setIsPolling(false);
            }
        };

        pollTelemetry();

        const activeInterval = isSocketConnected ? 10000 : intervalMs;
        const intervalId = setInterval(pollTelemetry, activeInterval);

        return () => {
            alive = false;
            clearInterval(intervalId);
        };
    }, [flights, intervalMs, enabled, isSocketConnected]);

    const activeTelemetryCount = Object.keys(telemetryMap).length;

    return {
        telemetryMap,
        telemetryHistoryMap,
        isPolling,
        isSocketConnected,
        activeTelemetryCount,
        setTelemetryMap,
        setTelemetryHistoryMap,
    };
}
