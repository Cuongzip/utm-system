"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";

const FLOATING_EDGE_MARGIN_PX = 12;
export const FLOATING_FAB_SIZE_PX = 40;
export const FLOATING_FAB_GAP_PX = 10;
const DRAG_THRESHOLD_PX = 5;

export const COPILOT_OFFSET_STORAGE_KEY = "utm_copilot_offset";
export const ALERT_FAB_OFFSET_STORAGE_KEY = "utm_alert_fab_offset";
const OFFSET_CHANGE_EVENT = "utm:floating-offset-change";

export interface ViewportOffset {
    right: number;
    bottom: number;
}

interface DragSession {
    pointerId: number;
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    boxWidth: number;
    boxHeight: number;
    lastRight: number;
    lastBottom: number;
    moved: boolean;
}

interface CachedEntry {
    raw: string | null;
    anchorRaw: string | null;
    viewportKey: string;
    snapshot: ViewportOffset;
}

const snapshotCache = new Map<string, CachedEntry>();

export function clampFloatingOffset(
    offset: ViewportOffset,
    boxWidth: number,
    boxHeight: number
): ViewportOffset {
    if (typeof window === "undefined") return offset;
    const maxRight = Math.max(
        FLOATING_EDGE_MARGIN_PX,
        window.innerWidth - boxWidth - FLOATING_EDGE_MARGIN_PX
    );
    const maxBottom = Math.max(
        FLOATING_EDGE_MARGIN_PX,
        window.innerHeight - boxHeight - FLOATING_EDGE_MARGIN_PX
    );
    return {
        right: Math.min(Math.max(FLOATING_EDGE_MARGIN_PX, Math.round(offset.right)), maxRight),
        bottom: Math.min(Math.max(FLOATING_EDGE_MARGIN_PX, Math.round(offset.bottom)), maxBottom),
    };
}

function parseStoredOffset(raw: string | null): ViewportOffset | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as Partial<ViewportOffset>;
        if (typeof parsed.right === "number" && typeof parsed.bottom === "number") {
            return { right: parsed.right, bottom: parsed.bottom };
        }
    } catch {
        return null;
    }
    return null;
}

function subscribeOffsetStore(callback: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener("resize", callback);
    window.addEventListener(OFFSET_CHANGE_EVENT, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("resize", callback);
        window.removeEventListener(OFFSET_CHANGE_EVENT, callback);
    };
}

function saveOffsetToStorage(storageKey: string, next: ViewportOffset) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new Event(OFFSET_CHANGE_EVENT));
    } catch {
        // ignore storage quota errors
    }
}

interface UseFloatingPositionOptions {
    storageKey: string;
    defaultOffset: ViewportOffset;
    boxSize?: number;
    fallbackAnchorStorageKey?: string;
    fallbackAnchorGapY?: number;
}

export function useFloatingPosition({
    storageKey,
    defaultOffset,
    boxSize = FLOATING_FAB_SIZE_PX,
    fallbackAnchorStorageKey,
    fallbackAnchorGapY = FLOATING_FAB_GAP_PX,
}: UseFloatingPositionOptions) {
    const getSnapshot = useCallback((): ViewportOffset => {
        if (typeof window === "undefined") return defaultOffset;

        const viewportKey = `${window.innerWidth}x${window.innerHeight}`;
        let raw: string | null = null;
        let anchorRaw: string | null = null;
        try {
            raw = localStorage.getItem(storageKey);
            if (!raw && fallbackAnchorStorageKey) {
                anchorRaw = localStorage.getItem(fallbackAnchorStorageKey);
            }
        } catch {
            raw = null;
            anchorRaw = null;
        }

        const cached = snapshotCache.get(storageKey);
        if (
            cached &&
            cached.raw === raw &&
            cached.anchorRaw === anchorRaw &&
            cached.viewportKey === viewportKey
        ) {
            return cached.snapshot;
        }

        let resolved: ViewportOffset = defaultOffset;
        const stored = parseStoredOffset(raw);
        if (stored) {
            resolved = stored;
        } else if (fallbackAnchorStorageKey) {
            const anchor = parseStoredOffset(anchorRaw);
            if (anchor) {
                const clampedAnchor = clampFloatingOffset(anchor, boxSize, boxSize);
                const aboveBottom = clampedAnchor.bottom + boxSize + fallbackAnchorGapY;
                const maxBottom = window.innerHeight - boxSize - FLOATING_EDGE_MARGIN_PX;
                const preferredBottom =
                    aboveBottom <= maxBottom
                        ? aboveBottom
                        : Math.max(
                              FLOATING_EDGE_MARGIN_PX,
                              clampedAnchor.bottom - boxSize - fallbackAnchorGapY
                          );
                resolved = { right: clampedAnchor.right, bottom: preferredBottom };
            }
        }

        const clamped = clampFloatingOffset(resolved, boxSize, boxSize);
        const nextSnapshot =
            cached &&
            cached.snapshot.right === clamped.right &&
            cached.snapshot.bottom === clamped.bottom
                ? cached.snapshot
                : clamped;

        snapshotCache.set(storageKey, {
            raw,
            anchorRaw,
            viewportKey,
            snapshot: nextSnapshot,
        });
        return nextSnapshot;
    }, [storageKey, defaultOffset, boxSize, fallbackAnchorStorageKey, fallbackAnchorGapY]);

    const getServerSnapshot = useCallback(() => defaultOffset, [defaultOffset]);

    const persistedOffset = useSyncExternalStore(
        subscribeOffsetStore,
        getSnapshot,
        getServerSnapshot
    );

    const [dragOffset, setDragOffset] = useState<ViewportOffset | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragSessionRef = useRef<DragSession | null>(null);

    const activeOffset = dragOffset ?? persistedOffset;

    const startDrag = useCallback(
        (
            e: React.PointerEvent<HTMLElement>,
            originOffset: ViewportOffset,
            boxWidth: number,
            boxHeight: number
        ) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            dragSessionRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                startRight: originOffset.right,
                startBottom: originOffset.bottom,
                boxWidth,
                boxHeight,
                lastRight: originOffset.right,
                lastBottom: originOffset.bottom,
                moved: false,
            };
        },
        []
    );

    const moveDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
        const session = dragSessionRef.current;
        if (!session || session.pointerId !== e.pointerId) return;

        const dx = e.clientX - session.startX;
        const dy = e.clientY - session.startY;
        if (!session.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
            session.moved = true;
            setIsDragging(true);
        }
        if (!session.moved) return;

        const next = clampFloatingOffset(
            {
                right: session.startRight - dx,
                bottom: session.startBottom - dy,
            },
            session.boxWidth,
            session.boxHeight
        );
        session.lastRight = next.right;
        session.lastBottom = next.bottom;
        setDragOffset(next);
    }, []);

    const endDrag = useCallback(
        (e: React.PointerEvent<HTMLElement>, onTap?: () => void) => {
            const session = dragSessionRef.current;
            if (!session || session.pointerId !== e.pointerId) return;

            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
            dragSessionRef.current = null;
            setIsDragging(false);

            if (session.moved) {
                saveOffsetToStorage(storageKey, {
                    right: session.lastRight,
                    bottom: session.lastBottom,
                });
                setDragOffset(null);
            } else {
                setDragOffset(null);
                onTap?.();
            }
        },
        [storageKey]
    );

    const cancelDrag = useCallback((e: React.PointerEvent<HTMLElement>) => {
        const session = dragSessionRef.current;
        if (!session || session.pointerId !== e.pointerId) return;
        dragSessionRef.current = null;
        setDragOffset(null);
        setIsDragging(false);
    }, []);

    return {
        activeOffset,
        isDragging,
        startDrag,
        moveDrag,
        endDrag,
        cancelDrag,
    };
}
