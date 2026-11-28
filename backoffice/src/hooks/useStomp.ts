"use client";

import { useEffect, useState, useRef } from "react";
import {
    getServiceClient,
    connectServiceStomp,
    subscribeServiceStomp,
    onServiceStompConnectionChange,
    type StompServiceName,
} from "@/lib/stomp";
import type { IMessage } from "@stomp/stompjs";
import type { TelemetryRecord } from "@/types";

interface UseStompOptions {
    service?: StompServiceName;
    autoConnect?: boolean;
}

export function useStomp(options: UseStompOptions = {}) {
    const { service = "telemetry", autoConnect = true } = options;
    const [isConnected, setIsConnected] = useState(() => getServiceClient(service).connected);

    useEffect(() => {
        const unsubscribe = onServiceStompConnectionChange(service, setIsConnected);
        if (autoConnect) {
            connectServiceStomp(service);
        }
        return () => {
            unsubscribe();
        };
    }, [service, autoConnect]);

    return {
        isConnected,
    };
}

export function useStompSubscription<T = unknown>(
    destination: string | null,
    onMessage: (data: T, message?: IMessage) => void,
    enabled = true,
    service: StompServiceName = "telemetry"
) {
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    });

    useEffect(() => {
        if (!enabled || !destination) return;

        connectServiceStomp(service);

        const unsubscribe = subscribeServiceStomp<T>(service, destination, (data, message) => {
            onMessageRef.current(data, message);
        });

        return () => {
            unsubscribe();
        };
    }, [destination, enabled, service]);
}

export function useTelemetryStream(
    onRecord: (record: TelemetryRecord) => void,
    flightId?: string | null,
    enabled = true
) {
    const destination = flightId ? `/topic/telemetry/flight/${flightId}` : "/topic/telemetry/live";

    useStompSubscription<TelemetryRecord>(destination, onRecord, enabled, "telemetry");
}
