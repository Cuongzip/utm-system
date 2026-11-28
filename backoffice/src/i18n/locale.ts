import { enUS, vi as viDateFnsLocale, type Locale as DateFnsLocale } from "date-fns/locale";
import enBase from "@/messages/en.json";
import viBase from "@/messages/vi.json";
import { enCore, viCore } from "./dictionaries/core";
import { enPlanning, viPlanning } from "./dictionaries/planning";
import { enAssets, viAssets } from "./dictionaries/assets";
import { enSafety, viSafety } from "./dictionaries/safety";

export type AppLocale = "en" | "vi";

export const DEFAULT_LOCALE: AppLocale = "en";
const LOCALE_STORAGE_KEY = "utm_locale";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const LOCALE_CHANGE_EVENT = "utm:locale-change";

export const MESSAGES = {
    en: {
        ...enBase,
        ...enCore,
        ...enPlanning,
        ...enAssets,
        ...enSafety,
    },
    vi: {
        ...viBase,
        ...viCore,
        ...viPlanning,
        ...viAssets,
        ...viSafety,
    },
} as const;

export type AppMessages = (typeof MESSAGES)["en"];

function isValidLocale(val: unknown): val is AppLocale {
    return val === "en" || val === "vi";
}

function readCookieLocale(): AppLocale | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
    const val = match?.[1]?.trim();
    return isValidLocale(val) ? val : null;
}

export function getCurrentLocale(): AppLocale {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    try {
        const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
        if (isValidLocale(stored)) return stored;
    } catch {
        // ignore storage access issues
    }
    return readCookieLocale() ?? DEFAULT_LOCALE;
}

export function setCurrentLocale(next: AppLocale): void {
    if (!isValidLocale(next) || typeof window === "undefined") return;
    try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
        // ignore storage quota errors
    }
    try {
        document.cookie = `${LOCALE_COOKIE_NAME}=${next}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = next;
    } catch {
        // ignore cookie write issues
    }
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
}

export function getDateFnsLocale(locale: AppLocale = getCurrentLocale()): DateFnsLocale {
    return locale === "vi" ? viDateFnsLocale : enUS;
}

export function translateStatusLabel(
    rawStatus?: string | null,
    locale: AppLocale = getCurrentLocale()
): string | undefined {
    if (!rawStatus) return undefined;
    const normalized = rawStatus
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, "_");
    const map = MESSAGES[locale].enums.statusLabels as Record<string, string>;
    return map[normalized];
}

export function translateRoleLabel(
    rawRole?: string | null,
    locale: AppLocale = getCurrentLocale()
): string {
    if (!rawRole) return locale === "vi" ? "VẬN HÀNH" : "OPERATOR";
    const key = rawRole.trim().toUpperCase();
    const map = MESSAGES[locale].enums.roles as Record<string, string>;
    return map[key] ?? rawRole;
}
