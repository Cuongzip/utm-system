import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

let stompClient: Client | null = null;
const connectionListeners = new Set<(connected: boolean) => void>();

export function getDefaultBrokerUrl(): string {
    if (process.env.NEXT_PUBLIC_WS_URL) {
        return process.env.NEXT_PUBLIC_WS_URL;
    }
    if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname;
        return `${protocol}//${host}:8081/telemetry/ws`;
    }
    return "ws://localhost:8081/telemetry/ws";
}

export function getStompClient(brokerUrl?: string): Client {
    if (!stompClient) {
        const url = brokerUrl || getDefaultBrokerUrl();
        stompClient = new Client({
            brokerURL: url,
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                connectionListeners.forEach((listener) => listener(true));
            },
            onDisconnect: () => {
                connectionListeners.forEach((listener) => listener(false));
            },
            onStompError: (frame) => {
                console.error("STOMP error:", frame.headers["message"], frame.body);
            },
            onWebSocketClose: () => {
                connectionListeners.forEach((listener) => listener(false));
            },
        });
    }
    return stompClient;
}

export function connectStomp(token?: string): void {
    const client = getStompClient();
    if (token) {
        client.connectHeaders = {
            Authorization: `Bearer ${token}`,
            token,
        };
    }
    if (!client.active) {
        client.activate();
    }
}

export function disconnectStomp(): void {
    if (stompClient && stompClient.active) {
        stompClient.deactivate();
    }
}

export function subscribeStomp<T = unknown>(
    destination: string,
    callback: (data: T, message: IMessage) => void
): () => void {
    const client = getStompClient();
    let subscription: StompSubscription | null = null;

    const doSubscribe = () => {
        if (client.connected && !subscription) {
            subscription = client.subscribe(destination, (message: IMessage) => {
                try {
                    const parsed = JSON.parse(message.body) as T;
                    callback(parsed, message);
                } catch {
                    callback(message.body as unknown as T, message);
                }
            });
        }
    };

    if (client.connected) {
        doSubscribe();
    }

    const listener = (connected: boolean) => {
        if (connected) {
            doSubscribe();
        } else {
            subscription = null;
        }
    };

    connectionListeners.add(listener);

    return () => {
        connectionListeners.delete(listener);
        if (subscription) {
            subscription.unsubscribe();
            subscription = null;
        }
    };
}

export function publishStomp(
    destination: string,
    body: unknown,
    headers: Record<string, string> = {}
): void {
    const client = getStompClient();
    if (client.connected) {
        client.publish({
            destination,
            body: typeof body === "string" ? body : JSON.stringify(body),
            headers,
        });
    }
}

export function onStompConnectionChange(callback: (connected: boolean) => void): () => void {
    connectionListeners.add(callback);
    if (stompClient) {
        callback(stompClient.connected);
    }
    return () => {
        connectionListeners.delete(callback);
    };
}
