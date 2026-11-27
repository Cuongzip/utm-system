import { toast } from "sonner";
import { getCurrentLocale, MESSAGES } from "@/i18n";

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
        items: res.items ?? [],
        total: res.total ?? res.items?.length ?? 0,
    };
}

let isRedirectingToLogin = false;

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const locale = getCurrentLocale();
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Accept-Language")) {
        headers.set("Accept-Language", locale);
    }

    const response = await fetch(endpoint, {
        ...options,
        headers,
    });

    const sessionExpiredMsg = MESSAGES[locale].errors.SESSION_EXPIRED_REDIRECT;

    if ((response.type === "cors" && response.redirected) || response.status === 401) {
        if (typeof window !== "undefined") {
            if (!isRedirectingToLogin) {
                isRedirectingToLogin = true;
                toast.error(sessionExpiredMsg);
                setTimeout(() => {
                    window.location.href = response.url || "/";
                }, 600);
            }
            throw new ApiError(401, sessionExpiredMsg);
        }
    }

    if (!response.ok) {
        let errorData: unknown;
        const text = await response.text();
        try {
            errorData = JSON.parse(text);
        } catch {
            errorData = text;
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

    const contentType = response.headers.get("content-type") || "";
    if (
        !contentType.includes("application/json") &&
        (response.url.includes("/openid-connect/auth") || response.url.includes("/login"))
    ) {
        if (typeof window !== "undefined") {
            if (!isRedirectingToLogin) {
                isRedirectingToLogin = true;
                toast.error(sessionExpiredMsg);
                setTimeout(() => {
                    window.location.href = response.url || "/";
                }, 600);
            }
            throw new ApiError(401, sessionExpiredMsg);
        }
    }

    return response.json() as Promise<T>;
}
