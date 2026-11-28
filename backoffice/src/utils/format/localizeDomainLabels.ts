import { getCurrentLocale, type AppLocale } from "@/i18n";
import { localizeServerText } from "./localizeServerText";
import {
    EN_RESPONSE_ACTION_LABELS,
    SIMULATION_EVENT_TYPE_LABELS,
    SIMULATION_SCENARIO_LABELS,
    VI_ALERT_TYPE_TITLES,
    VI_RESPONSE_ACTION_LABELS,
} from "./serverText";

export function localizeResponseAction(
    action?: string | null,
    locale: AppLocale = getCurrentLocale(),
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
    locale: AppLocale = getCurrentLocale()
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
    locale: AppLocale = getCurrentLocale()
): string {
    if (!rawType) return "";
    const upper = rawType.trim().toUpperCase();
    return SIMULATION_EVENT_TYPE_LABELS[upper]?.[locale] ?? upper.replace(/_/g, " ");
}

export function localizeSimScenario(
    rawScenario?: string | null,
    locale: AppLocale = getCurrentLocale()
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
