import { createTranslator } from "next-intl";
import enMessages from "@/messages/en.json";

export const errorTranslator = createTranslator({
    locale: "en",
    messages: enMessages,
});

type ErrorKey = `errors.${keyof typeof enMessages.errors}`;

export function translateError(
    errorCode: string,
    params: Record<string, unknown> = {}
): string | undefined {
    if (!(errorCode in enMessages.errors)) {
        return undefined;
    }

    const key = `errors.${errorCode as keyof typeof enMessages.errors}` as ErrorKey;

    const sanitizedParams: Record<string, string | number | Date> = {};
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) {
            sanitizedParams[k] =
                typeof v === "string" || typeof v === "number" || v instanceof Date ? v : String(v);
        }
    }

    try {
        return errorTranslator(key, sanitizedParams);
    } catch {
        return undefined;
    }
}
