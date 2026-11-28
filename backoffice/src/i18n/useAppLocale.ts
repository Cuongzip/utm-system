"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, getCurrentLocale, LOCALE_CHANGE_EVENT, type AppLocale } from "./locale";

function subscribeLocale(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener(LOCALE_CHANGE_EVENT, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(LOCALE_CHANGE_EVENT, callback);
    };
}

function getServerLocaleSnapshot(): AppLocale {
    return DEFAULT_LOCALE;
}

export function useAppLocale(): AppLocale {
    return useSyncExternalStore(subscribeLocale, getCurrentLocale, getServerLocaleSnapshot);
}
