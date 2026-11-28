"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveAlertItem } from "@/types";

const DISMISSED_STORAGE_KEY = "utm:dismissed-live-alerts";

function readPersistedDismissedIds(): Set<string> {
    if (typeof window === "undefined") return new Set();
    try {
        const raw = window.sessionStorage.getItem(DISMISSED_STORAGE_KEY);
        if (!raw) return new Set();
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return new Set(parsed.filter((v): v is string => typeof v === "string"));
        }
    } catch {
        return new Set();
    }
    return new Set();
}

function persistDismissedIds(ids: Set<string>) {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch {
        // Quota or private mode
    }
}

export function useDismissedAlerts(
    onDismissSingle: (id: string) => void,
    onDismissAll: () => void
) {
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
        readPersistedDismissedIds()
    );
    const dismissedIdsRef = useRef<Set<string>>(dismissedIds);

    useEffect(() => {
        dismissedIdsRef.current = dismissedIds;
    }, [dismissedIds]);

    const dismissAlert = useCallback(
        (id: string) => {
            const next = new Set(dismissedIdsRef.current);
            next.add(id);
            dismissedIdsRef.current = next;
            persistDismissedIds(next);
            setDismissedIds(next);
            onDismissSingle(id);
        },
        [onDismissSingle]
    );

    const dismissAllForList = useCallback(
        (alerts: LiveAlertItem[]) => {
            const next = new Set(dismissedIdsRef.current);
            alerts.forEach((a) => next.add(a.id));
            dismissedIdsRef.current = next;
            persistDismissedIds(next);
            setDismissedIds(next);
            onDismissAll();
        },
        [onDismissAll]
    );

    return {
        dismissedIds,
        dismissedIdsRef,
        dismissAlert,
        dismissAllForList,
    };
}
