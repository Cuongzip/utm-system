import { Client, type IMessage, type StompSubscription } from "@stomp/stompjs";

export type StompServiceName = "telemetry" | "alert" | "emergency";

const serviceClients = new Map<StompServiceName, Client>();
const serviceConnectionListeners = new Map<StompServiceName, Set<(connected: boolean) => void>>();

export function getServiceBrokerUrl(service: StompServiceName): string {
    if (process.env.NEXT_PUBLIC_WS_URL) {
        if (service === "telemetry") {
            return process.env.NEXT_PUBLIC_WS_URL;
        }
        try {
            const parsed = new URL(process.env.NEXT_PUBLIC_WS_URL);
            const newPathname = parsed.pathname.replace(/\/telemetry\/ws$/, `/${service}/ws`);
            return `${parsed.protocol}//${parsed.host}${newPathname}`;
        } catch {
            return process.env.NEXT_PUBLIC_WS_URL.replace(/telemetry\/ws$/, `${service}/ws`);
        }
    }
    if (typeof window !== "undefined") {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.hostname;
        return `${protocol}//${host}:8081/${service}/ws`;
    }
    return `ws://localhost:8081/${service}/ws`;
}

export function getDefaultBrokerUrl(): string {
    return getServiceBrokerUrl("telemetry");
}

function getServiceListeners(service: StompServiceName): Set<(connected: boolean) => void> {
    let listeners = serviceConnectionListeners.get(service);
    if (!listeners) {
        listeners = new Set();
        serviceConnectionListeners.set(service, listeners);
    }
    return listeners;
}

export function getServiceClient(service: StompServiceName): Client {
    let client = serviceClients.get(service);
    if (!client) {
        client = new Client({
            brokerURL: getServiceBrokerUrl(service),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                getServiceListeners(service).forEach((listener) => listener(true));
            },
            onDisconnect: () => {
                getServiceListeners(service).forEach((listener) => listener(false));
            },
            onStompError: (frame) => {
                console.error(`STOMP error [${service}]:`, frame.headers["message"], frame.body);
            },
            onWebSocketClose: () => {
                getServiceListeners(service).forEach((listener) => listener(false));
            },
        });
        serviceClients.set(service, client);
    }
    return client;
}

export function connectServiceStomp(service: StompServiceName, token?: string): void {
    const client = getServiceClient(service);
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

export function disconnectServiceStomp(service: StompServiceName): void {
    const client = serviceClients.get(service);
    if (client && client.active) {
        client.deactivate();
    }
}

export function subscribeServiceStomp<T = unknown>(
    service: StompServiceName,
    destination: string,
    callback: (data: T, message: IMessage) => void
): () => void {
    const client = getServiceClient(service);
    let subscription: StompSubscription | null = null;
    const listeners = getServiceListeners(service);

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

    listeners.add(listener);

    return () => {
        listeners.delete(listener);
        if (subscription) {
            subscription.unsubscribe();
            subscription = null;
        }
    };
}

export function onServiceStompConnectionChange(
    service: StompServiceName,
    callback: (connected: boolean) => void
): () => void {
    const listeners = getServiceListeners(service);
    listeners.add(callback);
    const client = serviceClients.get(service);
    if (client) {
        callback(client.connected);
    } else {
        callback(false);
    }
    return () => {
        listeners.delete(callback);
    };
}

export function getStompClient(brokerUrl?: string): Client {
    const client = getServiceClient("telemetry");
    if (brokerUrl && client.brokerURL !== brokerUrl) {
        client.brokerURL = brokerUrl;
    }
    return client;
}

export function connectStomp(token?: string): void {
    connectServiceStomp("telemetry", token);
}

export function disconnectStomp(): void {
    disconnectServiceStomp("telemetry");
}

export function subscribeStomp<T = unknown>(
    destination: string,
    callback: (data: T, message: IMessage) => void
): () => void {
    return subscribeServiceStomp<T>("telemetry", destination, callback);
}

export function publishStomp(
    destination: string,
    body: unknown,
    headers: Record<string, string> = {}
): void {
    const client = getServiceClient("telemetry");
    if (client.connected) {
        client.publish({
            destination,
            body: typeof body === "string" ? body : JSON.stringify(body),
            headers,
        });
    }
}

export function onStompConnectionChange(callback: (connected: boolean) => void): () => void {
    return onServiceStompConnectionChange("telemetry", callback);
}
