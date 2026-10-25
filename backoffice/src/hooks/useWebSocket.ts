"use client";

import { useStomp, useStompSubscription } from "./useStomp";

export { useStomp, useStompSubscription };

export interface UseWebSocketOptions {
    onMessage?: (data: unknown) => void;
    autoConnect?: boolean;
    token?: string;
}

export function useWebSocket(topic = "/topic/telemetry/live", options: UseWebSocketOptions = {}) {
    const { onMessage, autoConnect = true, token } = options;
    const { isConnected, connect, disconnect, publish } = useStomp({ autoConnect, token });

    useStompSubscription(onMessage ? topic : null, (data) => onMessage?.(data), Boolean(onMessage));

    return {
        isConnected,
        connect,
        disconnect,
        sendMessage: (data: unknown) => publish(topic, data),
    };
}
