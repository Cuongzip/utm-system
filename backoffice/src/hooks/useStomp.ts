"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    getServiceClient,
    connectServiceStomp,
    disconnectServiceStomp,
    subscribeServiceStomp,
    onServiceStompConnectionChange,
    type StompServiceName,
} from "@/lib/stomp";
import type { IMessage } from "@stomp/stompjs";
import type { TelemetryRecord } from "@/types";

interface UseStompOptions {
    service?: StompServiceName;
    autoConnect?: boolean;
    token?: string;
}

export function useStomp(options: UseStompOptions = {}) {
    const { service = "telemetry", autoConnect = true, token } = options;
    const [isConnected, setIsConnected] = useState(() => getServiceClient(service).connected);

    useEffect(() => {
        const unsubscribe = onServiceStompConnectionChange(service, setIsConnected);
        if (autoConnect) {
            connectServiceStomp(service, token);
        }
        return () => {
            unsubscribe();
        };
    }, [service, autoConnect, token]);

    const subscribe = useCallback(
        <T = unknown>(destination: string, callback: (data: T, message: IMessage) => void) => {
            return subscribeServiceStomp<T>(service, destination, callback);
        },
        [service]
    );

    const publish = useCallback(
        (destination: string, body: unknown, headers: Record<string, string> = {}) => {
            const client = getServiceClient(service);
            if (client.connected) {
                client.publish({
                    destination,
                    body: typeof body === "string" ? body : JSON.stringify(body),
                    headers,
                });
            }
        },
        [service]
    );

    return {
        isConnected,
        connect: (t?: string) => connectServiceStomp(service, t || token),
        disconnect: () => disconnectServiceStomp(service),
        subscribe,
        publish,
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
