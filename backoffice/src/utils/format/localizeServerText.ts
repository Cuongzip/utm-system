import { getCurrentLocale, type AppLocale } from "@/i18n/locale";
import { resolveEntityReferences, type EntityLookupSource } from "./resolveEntityReferences";
import {
    FLIGHT_LIFECYCLE_EVENT_LABELS,
    getViServerTextRules,
    ONBOARD_DIAGNOSTIC_LABELS,
    TIMELINE_EVENT_LABELS,
} from "./serverText";

export interface LocalizeServerTextOptions {
    entityMap?: EntityLookupSource;
}

export function localizeServerText(
    raw?: string | null,
    locale: AppLocale = getCurrentLocale(),
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

    for (const [pattern, replacement] of getViServerTextRules()) {
        if (typeof replacement === "string") {
            result = result.replace(pattern, replacement);
        } else {
            result = result.replace(pattern, replacement);
        }
    }

    return result;
}
