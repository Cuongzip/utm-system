import type { AppLocale } from "@/i18n";
import {
    EN_RESPONSE_ACTION_LABELS,
    FLIGHT_LIFECYCLE_EVENT_LABELS,
    ONBOARD_DIAGNOSTIC_LABELS,
    SIMULATION_EVENT_TYPE_LABELS,
    SIMULATION_SCENARIO_LABELS,
    TIMELINE_DATA_KEY_LABELS,
    TIMELINE_EVENT_LABELS,
    VI_ALERT_TYPE_TITLES,
    VI_RESPONSE_ACTION_LABELS,
    VI_SERVER_TEXT_RULES,
} from "./serverTextRules";

function resolveDefaultLocale(): AppLocale {
    if (typeof window === "undefined") return "en";
    try {
        const stored = window.localStorage.getItem("utm_locale");
        if (stored === "en" || stored === "vi") return stored;
    } catch {
        // ignore storage errors
    }
    if (typeof document !== "undefined") {
        const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(en|vi)\b/);
        if (match?.[1] === "en" || match?.[1] === "vi") return match[1];
    }
    return "en";
}

export type EntityLookupSource = ReadonlyMap<string, string> | Record<string, string>;

export interface LocalizeServerTextOptions {
    entityMap?: EntityLookupSource;
}

const UUID_GLOBAL_REGEX = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;

function lookupEntityCode(uuid: string, source?: EntityLookupSource): string | undefined {
    if (!source) return undefined;
    const lower = uuid.toLowerCase();
    if (
        source instanceof Map ||
        typeof (source as ReadonlyMap<string, string>).get === "function"
    ) {
        const m = source as ReadonlyMap<string, string>;
        return m.get(uuid) ?? m.get(lower);
    }
    const rec = source as Record<string, string>;
    return rec[uuid] ?? rec[lower];
}

export function resolveEntityReferences(raw: string, entityMap?: EntityLookupSource): string {
    if (!raw) return "";
    return raw.replace(UUID_GLOBAL_REGEX, (uuid, _g1, offset: number, full: string) => {
        const mapped = lookupEntityCode(uuid, entityMap);
        if (mapped) return mapped;

        const prefixSlice = full.slice(Math.max(0, offset - 16), offset).toLowerCase();
        const shortHex = uuid.slice(0, 8).toUpperCase();
        if (/\bhub\s+$/.test(prefixSlice)) return `HUB-${shortHex}`;
        if (/\bflight\s+$/.test(prefixSlice)) return `FLT-${shortHex}`;
        if (/\bdrone\s+$/.test(prefixSlice)) return `DRN-${shortHex}`;
        return shortHex;
    });
}

export function localizeResponseAction(
    action?: string | null,
    locale: AppLocale = resolveDefaultLocale(),
    uppercase = false
): string {
    if (!action) return "";
    const key = action.trim().toUpperCase();
    const mapped =
        locale === "vi"
            ? (VI_RESPONSE_ACTION_LABELS[key] ?? action.replace(/_/g, " "))
            : (EN_RESPONSE_ACTION_LABELS[key] ?? action.replace(/_/g, " "));
    return uppercase ? mapped.toUpperCase() : mapped;
}

export function localizeAlertTypeTitle(
    rawType?: string | null,
    locale: AppLocale = resolveDefaultLocale()
): string {
    if (!rawType) return "";
    const upper = rawType.trim().toUpperCase();
    if (locale === "vi") {
        return VI_ALERT_TYPE_TITLES[upper] ?? localizeServerText(rawType, locale).toUpperCase();
    }
    return upper.replace(/_/g, " ");
}

export function localizeSimEventType(
    rawType?: string | null,
    locale: AppLocale = resolveDefaultLocale()
): string {
    if (!rawType) return "";
    const upper = rawType.trim().toUpperCase();
    return SIMULATION_EVENT_TYPE_LABELS[upper]?.[locale] ?? upper.replace(/_/g, " ");
}

export function localizeSimScenario(
    rawScenario?: string | null,
    locale: AppLocale = resolveDefaultLocale()
): string {
    if (!rawScenario) return "";
    const trimmed = rawScenario.trim();
    const byScenario = SIMULATION_SCENARIO_LABELS[trimmed.toLowerCase()];
    if (byScenario) return byScenario[locale];
    const byAction =
        locale === "vi"
            ? VI_RESPONSE_ACTION_LABELS[trimmed.toUpperCase()]
            : EN_RESPONSE_ACTION_LABELS[trimmed.toUpperCase()];
    if (byAction) return byAction.toUpperCase();
    return trimmed.replace(/_/g, " ").toUpperCase();
}

export function localizeServerText(
    raw?: string | null,
    locale: AppLocale = resolveDefaultLocale(),
    options?: LocalizeServerTextOptions
): string {
    if (!raw) return "";

    const trimmed = raw.trim();
    if (!trimmed) return "";

    const timelineMatch = TIMELINE_EVENT_LABELS[trimmed.toLowerCase()];
    if (timelineMatch) {
        return timelineMatch[locale];
    }

    const diagMatch = ONBOARD_DIAGNOSTIC_LABELS[trimmed.toUpperCase()];
    if (diagMatch) {
        return diagMatch[locale];
    }

    let result = resolveEntityReferences(trimmed, options?.entityMap);

    if (locale !== "vi") {
        return result
            .replace(
                /^AUTO FAILSAFE:\s*([A-Z0-9_-]+)\s+executing for\s+[a-z0-9_]+\.\s*/i,
                "Auto failsafe ($1) · "
            )
            .replace(
                /\b(FLIGHT_[A-Z0-9_]+)\b/g,
                (token) => FLIGHT_LIFECYCLE_EVENT_LABELS[token]?.en ?? token.replace(/_/g, " ")
            )
            .replace(/\b([a-z]+)_([a-z0-9_]+)\b/g, (match) => match.replace(/_/g, " "));
    }

    for (const [pattern, replacement] of VI_SERVER_TEXT_RULES) {
        if (typeof replacement === "string") {
            result = result.replace(pattern, replacement);
        } else {
            result = result.replace(pattern, replacement);
        }
    }

    return result;
}

export function formatTimelineEntryData(
    data?: Record<string, unknown> | null,
    locale: AppLocale = resolveDefaultLocale(),
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
