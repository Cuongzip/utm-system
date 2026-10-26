"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
    getStompClient,
    connectStomp,
    disconnectStomp,
    subscribeStomp,
    publishStomp,
    onStompConnectionChange,
} from "@/lib/stomp";
import type { TelemetryRecord } from "@/types";

interface UseStompOptions {
    autoConnect?: boolean;
    token?: string;
}

export function useStomp(options: UseStompOptions = {}) {
    const { autoConnect = true, token } = options;
    const [isConnected, setIsConnected] = useState(() => getStompClient().connected);

    useEffect(() => {
        const unsubscribe = onStompConnectionChange(setIsConnected);
        if (autoConnect) {
            connectStomp(token);
        }
        return () => {
            unsubscribe();
        };
    }, [autoConnect, token]);

    const subscribe = useCallback(
        <T = unknown>(destination: string, callback: (data: T) => void) => {
            return subscribeStomp<T>(destination, callback);
        },
        []
    );

    const publish = useCallback(
        (destination: string, body: unknown, headers?: Record<string, string>) => {
            publishStomp(destination, body, headers);
        },
        []
    );

    return {
        isConnected,
        connect: connectStomp,
        disconnect: disconnectStomp,
        subscribe,
        publish,
    };
}

export function useStompSubscription<T = unknown>(
    destination: string | null,
    onMessage: (data: T) => void,
    enabled = true
) {
    const onMessageRef = useRef(onMessage);
    useEffect(() => {
        onMessageRef.current = onMessage;
    });

    useEffect(() => {
        if (!enabled || !destination) return;

        connectStomp();

        const unsubscribe = subscribeStomp<T>(destination, (data) => {
            onMessageRef.current(data);
        });

        return () => {
            unsubscribe();
        };
    }, [destination, enabled]);
}

export function useTelemetryStream(
    onRecord: (record: TelemetryRecord) => void,
    flightId?: string | null,
    enabled = true
) {
    const destination = flightId ? `/topic/telemetry/flight/${flightId}` : "/topic/telemetry/live";

    useStompSubscription<TelemetryRecord>(destination, onRecord, enabled);
}

export function useDeviceHeartbeats(onHeartbeat: (data: unknown) => void, enabled = true) {
    useStompSubscription("/topic/connectivity/heartbeats", onHeartbeat, enabled);
}

export function useHubStatusUpdates(
    hubId: string | null,
    onUpdate: (data: unknown) => void,
    enabled = true
) {
    const destination = hubId ? `/topic/hubs/${hubId}` : null;
    useStompSubscription(destination, onUpdate, enabled);
}

export function useAlertStream(onAlert: (data: unknown) => void, enabled = true) {
    useStompSubscription("/topic/alerts/critical", onAlert, enabled);
}
