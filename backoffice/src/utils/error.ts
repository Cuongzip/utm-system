export interface ParsedApiError {
    message: string;
    fieldErrors: Record<string, string>;
}

export function parseApiError(err: unknown, defaultMessage = "An error occurred"): ParsedApiError {
    const fieldErrors: Record<string, string> = {};
    let message = defaultMessage;

    if (!err) {
        return { message, fieldErrors };
    }

    let rawData: unknown = null;

    if (typeof err === "object" && err !== null) {
        if ("data" in err) {
            rawData = (err as { data: unknown }).data;
        } else if ("response" in err) {
            const resp = (err as { response?: { data?: unknown } }).response;
            rawData = resp?.data;
        }
    }

    if (typeof rawData === "string") {
        const textData = rawData.trim();
        try {
            rawData = JSON.parse(textData);
        } catch {
            if (textData.length > 0 && !textData.startsWith("<")) {
                message = textData;
            }
        }
    }

    if (rawData && typeof rawData === "object") {
        const errorObj = rawData as Record<string, unknown>;

        if (typeof errorObj.detail === "string" && errorObj.detail.trim().length > 0) {
            message = errorObj.detail;
        } else if (typeof errorObj.message === "string" && errorObj.message.trim().length > 0) {
            message = errorObj.message;
        } else if (typeof errorObj.title === "string" && errorObj.title.trim().length > 0) {
            message = errorObj.title;
        }

        const rawList =
            errorObj.fieldErrors ||
            errorObj.errors ||
            errorObj.validationErrors ||
            errorObj.details;

        if (Array.isArray(rawList)) {
            for (const item of rawList) {
                if (typeof item === "string") {
                    const match = item.match(/^([a-zA-Z0-9_.]+)(?::\s*|\s+)(.+)$/);
                    if (match) {
                        const [, fullField, errorText] = match;
                        fieldErrors[fullField] = errorText.trim();
                        if (fullField.includes(".")) {
                            const leaf = fullField.split(".").pop();
                            if (leaf && !fieldErrors[leaf]) {
                                fieldErrors[leaf] = errorText.trim();
                            }
                        }
                    } else if (item.trim().length > 0) {
                        if (!message || message === defaultMessage) {
                            message = item;
                        }
                    }
                } else if (item && typeof item === "object") {
                    const obj = item as Record<string, unknown>;
                    const field = String(obj.field || obj.name || obj.property || obj.path || "");
                    const msg = String(obj.message || obj.error || obj.defaultMessage || "");
                    if (field && msg) {
                        fieldErrors[field] = msg;
                        if (field.includes(".")) {
                            const leaf = field.split(".").pop();
                            if (leaf && !fieldErrors[leaf]) {
                                fieldErrors[leaf] = msg;
                            }
                        }
                    }
                }
            }
        } else if (rawList && typeof rawList === "object") {
            for (const [key, val] of Object.entries(rawList)) {
                if (typeof val === "string") {
                    fieldErrors[key] = val;
                } else if (Array.isArray(val) && typeof val[0] === "string") {
                    fieldErrors[key] = val[0];
                }
            }
        }
    } else if (err instanceof Error && err.message) {
        message = err.message;
    }

    if (!fieldErrors.code && /code.*already exist/i.test(message)) {
        fieldErrors.code = message;
    }
    if (!fieldErrors.registrationNumber && /registration.*number.*already exist/i.test(message)) {
        fieldErrors.registrationNumber = message;
    }
    if (!fieldErrors.deviceIdentifier && /device.*identifier.*already exist/i.test(message)) {
        fieldErrors.deviceIdentifier = message;
    }

    return { message, fieldErrors };
}
