import { createTranslator } from "next-intl";
import enMessages from "@/messages/en.json";
import viMessages from "@/messages/vi.json";
import { getCurrentLocale, type AppLocale } from "@/i18n";

const translators: Record<AppLocale, ReturnType<typeof createTranslator<typeof enMessages>>> = {
    en: createTranslator({
        locale: "en",
        messages: enMessages,
    }),
    vi: createTranslator({
        locale: "vi",
        messages: viMessages,
    }),
};

type ErrorKey = `errors.${keyof typeof enMessages.errors}`;

export function translateError(
    errorCode: string,
    params: Record<string, unknown> = {},
    locale: AppLocale = getCurrentLocale()
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
        return translators[locale](key, sanitizedParams);
    } catch {
        return undefined;
    }
}
