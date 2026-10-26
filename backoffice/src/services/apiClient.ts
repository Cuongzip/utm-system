import { toast } from "sonner";

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public data?: unknown
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export function buildUrl(endpoint: string, params?: Record<string, unknown>): string {
    if (!params) return endpoint;
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "" && value !== "all") {
            searchParams.set(key, String(value));
        }
    }
    const qs = searchParams.toString();
    if (!qs) return endpoint;
    return endpoint.includes("?") ? `${endpoint}&${qs}` : `${endpoint}?${qs}`;
}

export function normalizeList<T>(res: { items?: T[]; total?: number } | T[] | null | undefined): {
    items: T[];
    total: number;
} {
    if (!res) return { items: [], total: 0 };
    if (Array.isArray(res)) {
        return { items: res, total: res.length };
    }
    return {
        items: res.items || [],
        total: res.total !== undefined ? res.total : res.items?.length || 0,
    };
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(endpoint, {
        credentials: "same-origin",
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorData: unknown;
        const text = await response.text();
        try {
            errorData = JSON.parse(text);
        } catch {
            errorData = text;
        }

        if (typeof window !== "undefined") {
            if (response.status === 401 && !endpoint.includes("/oauth2/")) {
                toast.error("Session expired. Please log in again.");
            } else if (response.status === 403) {
                toast.error("Access denied. You do not have permission to perform this action.");
            }
        }

        throw new ApiError(
            response.status,
            `API request failed with status ${response.status}`,
            errorData
        );
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json() as Promise<T>;
}
