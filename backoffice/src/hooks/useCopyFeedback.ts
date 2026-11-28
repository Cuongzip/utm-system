"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCopyFeedback<K extends string = string>(resetMs = 2000) {
    const [copiedKey, setCopiedKey] = useState<K | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    const copyWithFeedback = useCallback(
        async (key: K, value: string): Promise<boolean> => {
            try {
                await navigator.clipboard.writeText(value);
                setCopiedKey(key);
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
                timerRef.current = setTimeout(() => {
                    setCopiedKey((prev) => (prev === key ? null : prev));
                }, resetMs);
                return true;
            } catch {
                return false;
            }
        },
        [resetMs]
    );

    return { copiedKey, copyWithFeedback };
}
