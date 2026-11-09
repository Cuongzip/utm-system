import { translateError } from "./errorTranslator";

export interface ParsedApiError {
    message: string;
    cleanMessage: string;
    description?: string;
    errorCode?: string;
    statusCode?: number;
    title?: string;
    detail?: string;
    params: Record<string, unknown>;
    fieldErrors: Record<string, string>;
    raw?: unknown;
}

const ERROR_CODE_FIELD_MAP: Record<string, string | string[]> = {
    AIRSPACE_ZONE_CODE_ALREADY_EXISTED: "code",
    AIRSPACE_ZONE_NAME_ALREADY_EXISTED: "name",
    HUB_CODE_ALREADY_EXISTED: "code",
    REGISTRATION_NUMBER_ALREADY_EXISTED: "registrationNumber",
    ORGANIZATION_REGISTRATION_NUMBER_ALREADY_EXISTED: "registrationNumber",
    FLIGHT_NUMBER_ALREADY_EXISTED: "flightNumber",
    MISSION_CODE_ALREADY_EXISTED: "code",
    DEVICE_IDENTIFIER_ALREADY_EXISTED: ["deviceIdentifier", "identifier"],
    INCIDENT_NUMBER_ALREADY_EXISTED: "incidentNumber",
};

interface ApiErrorResponse {
    status?: number;
    statusCode?: number | string;
    errorCode?: string;
    title?: string;
    detail?: string;
    message?: string;
    params?: Record<string, unknown>;
    fieldErrors?: Array<{
        field?: string;
        name?: string;
        message?: string;
        defaultMessage?: string;
    }>;
    errors?: Array<{ field?: string; name?: string; message?: string; defaultMessage?: string }>;
    validationErrors?: Array<{
        field?: string;
        name?: string;
        message?: string;
        defaultMessage?: string;
    }>;
}

export function parseApiError(err: unknown, defaultMessage = "An error occurred"): ParsedApiError {
    if (!err) {
        return {
            message: defaultMessage,
            cleanMessage: defaultMessage,
            params: {},
            fieldErrors: {},
            raw: err,
        };
    }

    const errorObj = err as Record<string, unknown>;
    const responseObj = (errorObj.response || {}) as Record<string, unknown>;
    const rawData = responseObj.data ?? errorObj.data ?? err;
    const rawString = typeof rawData === "string" ? rawData.trim() : undefined;
    const body = (
        typeof rawData === "object" && rawData !== null ? rawData : {}
    ) as ApiErrorResponse;

    const rawStatus = responseObj.status ?? errorObj.status ?? body?.statusCode ?? body?.status;
    const statusCode =
        typeof rawStatus === "string"
            ? parseInt(rawStatus, 10) || undefined
            : typeof rawStatus === "number"
              ? rawStatus
              : undefined;

    const errorCode =
        typeof body?.errorCode === "string" && body.errorCode.trim().length > 0
            ? body.errorCode.trim()
            : undefined;
    const title =
        typeof body?.title === "string" && body.title.trim().length > 0
            ? body.title.trim()
            : undefined;
    const detail =
        typeof body?.detail === "string" && body.detail.trim().length > 0
            ? body.detail.trim()
            : typeof body?.message === "string" && body.message.trim().length > 0
              ? body.message.trim()
              : rawString && !rawString.startsWith("<")
                ? rawString
                : err instanceof Error
                  ? err.message
                  : undefined;

    const params: Record<string, unknown> =
        body?.params && typeof body.params === "object" && !Array.isArray(body.params)
            ? { ...body.params }
            : {};

    const fieldErrors: Record<string, string> = {};
    const rawList = body?.fieldErrors || body?.errors || body?.validationErrors;
    if (Array.isArray(rawList)) {
        for (const item of rawList) {
            if (item && typeof item === "object") {
                const field = String(item.field || item.name || "");
                const msg = String(item.message || item.defaultMessage || "");
                if (field && msg) {
                    fieldErrors[field] = msg;
                    if (field.includes(".")) {
                        const leaf = field.split(".").pop();
                        if (leaf && !fieldErrors[leaf]) fieldErrors[leaf] = msg;
                    }
                }
            }
        }
    }

    let cleanMessage: string;
    const translated = errorCode ? translateError(errorCode, params) : undefined;

    if (translated) {
        cleanMessage = translated;
    } else if (errorCode?.endsWith("_NOT_FOUND")) {
        cleanMessage = "The requested resource was not found.";
    } else if (statusCode === 401) {
        cleanMessage = translateError("UNAUTHORIZED") || "Session expired. Please log in again.";
    } else if (statusCode === 403) {
        cleanMessage =
            translateError("ACCESS_DENIED") ||
            "Access denied. You do not have permission to perform this action.";
    } else if (statusCode === 404) {
        cleanMessage = "The requested resource was not found.";
    } else if (statusCode && statusCode >= 500) {
        cleanMessage =
            translateError("INTERNAL_SERVER_ERROR") ||
            "An unexpected server error occurred. Please try again later.";
    } else if (
        err instanceof TypeError ||
        (detail && /failed to fetch|network error|econnrefused/i.test(detail))
    ) {
        cleanMessage =
            translateError("NETWORK_ERROR") ||
            "Unable to connect to the server. Please check your network connection.";
    } else {
        cleanMessage = detail || defaultMessage;
    }

    if (errorCode && ERROR_CODE_FIELD_MAP[errorCode]) {
        const targets = Array.isArray(ERROR_CODE_FIELD_MAP[errorCode])
            ? (ERROR_CODE_FIELD_MAP[errorCode] as string[])
            : [ERROR_CODE_FIELD_MAP[errorCode] as string];
        for (const target of targets) {
            if (!fieldErrors[target]) fieldErrors[target] = cleanMessage;
        }
    }

    let description: string | undefined;
    const fieldErrorCount = Object.keys(fieldErrors).length;
    if (errorCode === "VALIDATION_FAILED" || (!errorCode && fieldErrorCount > 0)) {
        cleanMessage = translateError("VALIDATION_FAILED") || "Validation failed";
        description =
            fieldErrorCount === 1
                ? Object.values(fieldErrors)[0]
                : translateError("VALIDATION_MULTIPLE_FIELDS") ||
                  "Please check the highlighted form fields.";
    }

    return {
        message: cleanMessage,
        cleanMessage,
        description,
        errorCode,
        statusCode,
        title,
        detail,
        params,
        fieldErrors,
        raw: err,
    };
}
