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
        try {
            errorData = await response.json();
        } catch {
            errorData = await response.text();
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
