import { getCurrentLocale, type AppLocale } from "@/i18n";
import { localizeResponseAction } from "./localizeDomainLabels";
import { localizeServerText, type LocalizeServerTextOptions } from "./localizeServerText";
import { resolveEntityReferences } from "./resolveEntityReferences";
import { FLIGHT_LIFECYCLE_EVENT_LABELS, TIMELINE_DATA_KEY_LABELS } from "./serverText";

export function formatTimelineEntryData(
    data?: Record<string, unknown> | null,
    locale: AppLocale = getCurrentLocale(),
    options?: LocalizeServerTextOptions
): string {
    if (!data) return "";
    const parts: string[] = [];

    for (const [rawKey, rawVal] of Object.entries(data)) {
        if (rawVal == null || rawVal === "") continue;
        const strVal = String(rawVal).trim();
        if (!strVal) continue;

        const keyLabel = TIMELINE_DATA_KEY_LABELS[rawKey]?.[locale] ?? rawKey;
        let displayVal: string;

        if (rawKey === "action" || rawKey === "commandType") {
            displayVal = localizeResponseAction(strVal, locale);
        } else if (rawKey === "flightEvent") {
            displayVal =
                FLIGHT_LIFECYCLE_EVENT_LABELS[strVal.toUpperCase()]?.[locale] ??
                strVal.replace(/_/g, " ");
        } else if (rawKey === "timeoutSeconds") {
            displayVal = `${strVal}s`;
        } else if (rawKey === "touchdownAlt") {
            displayVal = `${strVal}m`;
        } else if (rawKey === "autoExecuted") {
            const isTrue = rawVal === true || strVal.toLowerCase() === "true";
            displayVal = isTrue
                ? locale === "vi"
                    ? "Có"
                    : "Yes"
                : locale === "vi"
                  ? "Không"
                  : "No";
        } else if (
            rawKey === "resolvedBy" ||
            rawKey === "confirmedBy" ||
            rawKey === "rejectedBy" ||
            rawKey === "operator"
        ) {
            if (strVal.toLowerCase() === "system") {
                displayVal = locale === "vi" ? "Hệ thống" : "System";
            } else if (strVal.toLowerCase() === "operator") {
                displayVal = locale === "vi" ? "Trực ban" : "Operator";
            } else {
                displayVal = resolveEntityReferences(strVal, options?.entityMap);
            }
        } else if (rawKey === "notes") {
            displayVal = localizeServerText(strVal, locale, options);
        } else {
            displayVal = resolveEntityReferences(strVal, options?.entityMap);
        }

        parts.push(`${keyLabel}: ${displayVal}`);
    }

    return parts.join(" · ");
}
