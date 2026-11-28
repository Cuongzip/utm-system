"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAppLocale } from "@/i18n";
import { useEntityCodeMap } from "@/hooks/useEntityCodeMap";
import {
    QUERY_KEYS,
    useActiveAlerts,
    useEmergencyActiveIncidents,
    useFlightsAll,
} from "@/hooks/useQueries";
import { alertService } from "@/services";
import {
    ALERT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    INCIDENT_STATUS,
    type AlertVm,
    type FlightStatus,
    type LiveAlertItem,
} from "@/types";
import {
    getAlertPriorityRank,
    getAlertSeverityTier,
    isElevatedAlert,
    type AlertSeverityTier,
    type AlertTierCounts,
} from "@/components/alerts/alertUtils";
import {
    isFreshAlert,
    normalizeAlertItem,
    normalizeIncidentItem,
    relocalizeLiveItem,
    type AlertLocalizeContext,
} from "./liveAlerts/normalizers";
import { useDismissedAlerts } from "./liveAlerts/useDismissedAlerts";
import { useLiveAlertsRealtime } from "./liveAlerts/useLiveAlertsRealtime";

const TRANSIENT_OVERLAY_MS = 8000;

interface LiveAlertsContextValue {
    alerts: LiveAlertItem[];
    activeAlert: LiveAlertItem | null;
    currentIndex: number;
    totalCount: number;
    highestTier: AlertSeverityTier | null;
    tierCounts: AlertTierCounts;
    entityMap: ReadonlyMap<string, string>;
    isOverlayVisible: boolean;
    isOverlayMinimized: boolean;
    isDrawerOpen: boolean;
    acknowledgingId: string | null;
    alertConnected: boolean;
    emergencyConnected: boolean;
    nextAlert: () => void;
    prevAlert: () => void;
    minimizeOverlay: () => void;
    restoreOverlay: () => void;
    setOverlayInteracting: (interacting: boolean) => void;
    openDrawer: () => void;
    closeDrawer: () => void;
    setDrawerOpen: (open: boolean) => void;
    acknowledgeAlert: (id: string) => void;
    dismissAlert: (id: string) => void;
    dismissAll: () => void;
}

const LiveAlertsContext = createContext<LiveAlertsContextValue | null>(null);

export function LiveAlertsProvider({ children }: { children: ReactNode }) {
    const t = useTranslations("alerts");
    const pathname = usePathname();
    const locale = useAppLocale();
    const entityMap = useEntityCodeMap();
    const queryClient = useQueryClient();

    const [realtimeMap, setRealtimeMap] = useState<Map<string, LiveAlertItem>>(() => new Map());
    const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isOverlayMinimized, setIsOverlayMinimized] = useState(false);
    const [isOverlayPinned, setIsOverlayPinned] = useState(false);
    const [transientAlertId, setTransientAlertId] = useState<string | null>(null);
    const [isOverlayInteracting, setIsOverlayInteracting] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [prevPathname, setPrevPathname] = useState(pathname);

    if (prevPathname !== pathname) {
        setPrevPathname(pathname);
        if (isDrawerOpen) {
            setIsDrawerOpen(false);
        }
    }

    const handleSingleDismissCleanup = useCallback((id: string) => {
        setTransientAlertId((prev) => (prev === id ? null : prev));
        setCurrentIndex(0);
    }, []);

    const handleAllDismissCleanup = useCallback(() => {
        setTransientAlertId(null);
        setCurrentIndex(0);
    }, []);

    const { dismissedIds, dismissedIdsRef, dismissAlert, dismissAllForList } = useDismissedAlerts(
        handleSingleDismissCleanup,
        handleAllDismissCleanup
    );

    const { data: initialAlerts = [] } = useActiveAlerts();
    const { data: initialIncidents = [] } = useEmergencyActiveIncidents();
    const { data: allFlights = [] } = useFlightsAll();

    const flightStatusMap = useMemo(() => {
        const m = new Map<string, FlightStatus | undefined>();
        for (const f of allFlights) {
            if (f.id) m.set(f.id, f.status);
        }
        return m;
    }, [allFlights]);

    const flightStatusMapRef = useRef(flightStatusMap);
    useEffect(() => {
        flightStatusMapRef.current = flightStatusMap;
    }, [flightStatusMap]);

    const localizeCtx = useMemo<AlertLocalizeContext>(
        () => ({
            locale,
            entityMap,
            fallbackAlertTitle: t("fallbackAlertTitle"),
            fallbackAirspaceAnomaly: t("fallbackAirspaceAnomaly"),
            fallbackEmergencyTitle: t("fallbackEmergencyTitle"),
            formatAlertDetected: (type: string) => t("fallbackAlertDetected", { type }),
            formatFailsafeRequired: (drone: string, action: string) =>
                t("fallbackFailsafeRequired", { drone, action }),
            formatConfirmTitle: (protocol: string) => t("fallbackConfirmTitle", { protocol }),
            formatConfirmMessage: (action: string, drone: string) =>
                t("fallbackConfirmMessage", { action, drone }),
        }),
        [locale, entityMap, t]
    );

    const markRemoved = useCallback((id: string) => {
        setRemovedIds((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
        setRealtimeMap((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
        setTransientAlertId((prev) => (prev === id ? null : prev));
    }, []);

    const upsertRealtime = useCallback((normalized: LiveAlertItem) => {
        setRemovedIds((prev) => {
            if (!prev.has(normalized.id)) return prev;
            const next = new Set(prev);
            next.delete(normalized.id);
            return next;
        });
        setRealtimeMap((prev) => {
            const next = new Map(prev);
            next.set(normalized.id, normalized);
            return next;
        });
        setIsOverlayMinimized(false);
        setCurrentIndex(0);
        if (!isElevatedAlert(normalized)) {
            setTransientAlertId(normalized.id);
        }
    }, []);

    const { alertConnected, emergencyConnected } = useLiveAlertsRealtime({
        dismissedIdsRef,
        flightStatusMapRef,
        onUpsertRealtime: upsertRealtime,
        onMarkRemoved: markRemoved,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: (id: string) => alertService.acknowledgeAlert(id),
        onSuccess: (_data, id) => {
            markRemoved(id);
            toast.success(t("alertAcknowledged"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alertsActive });
        },
        meta: { defaultErrorMessage: t("failedToAcknowledge") },
    });

    const alerts = useMemo(() => {
        const merged = new Map<string, LiveAlertItem>();
        const activeIncidentIds = new Set<string>();

        for (const inc of initialIncidents) {
            if (!inc.id || dismissedIds.has(inc.id) || removedIds.has(inc.id)) continue;
            if (CLOSED_INCIDENT_STATUSES.includes(inc.status)) continue;
            const isPending = inc.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
            if (!isFreshAlert(inc.detectedAt ?? inc.createdOn, isPending)) continue;

            activeIncidentIds.add(inc.id);
            merged.set(inc.id, normalizeIncidentItem(inc, localizeCtx));
        }

        for (const [id, item] of realtimeMap.entries()) {
            if (dismissedIds.has(id) || removedIds.has(id)) continue;
            if (item.source === "emergency") {
                activeIncidentIds.add(id);
            }
        }

        for (const a of initialAlerts) {
            if (!a.id || dismissedIds.has(a.id) || removedIds.has(a.id)) continue;
            if (
                a.status === ALERT_STATUS.RESOLVED ||
                a.status === ALERT_STATUS.DISMISSED ||
                a.status === ALERT_STATUS.ACKNOWLEDGED
            ) {
                continue;
            }
            if (!isFreshAlert(a.createdOn, false)) continue;

            if (a.incidentId && activeIncidentIds.has(a.incidentId)) continue;

            merged.set(a.id, normalizeAlertItem(a, flightStatusMap, localizeCtx));
        }

        for (const [id, item] of realtimeMap.entries()) {
            if (dismissedIds.has(id) || removedIds.has(id)) continue;
            if (item.source === "alert" && item.raw && typeof item.raw === "object") {
                const linkedIncidentId = (item.raw as AlertVm).incidentId;
                if (linkedIncidentId && activeIncidentIds.has(linkedIncidentId)) continue;
            }
            merged.set(id, relocalizeLiveItem(item, flightStatusMap, localizeCtx));
        }

        return Array.from(merged.values())
            .sort((a, b) => {
                const rankDiff = getAlertPriorityRank(a) - getAlertPriorityRank(b);
                if (rankDiff !== 0) return rankDiff;
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            })
            .slice(0, 50);
    }, [
        initialAlerts,
        initialIncidents,
        realtimeMap,
        dismissedIds,
        removedIds,
        flightStatusMap,
        localizeCtx,
    ]);

    useEffect(() => {
        if (!transientAlertId || isOverlayInteracting) return;
        const timer = window.setTimeout(() => {
            setTransientAlertId(null);
        }, TRANSIENT_OVERLAY_MS);
        return () => window.clearTimeout(timer);
    }, [transientAlertId, isOverlayInteracting]);

    const totalCount = alerts.length;

    const tierCounts = useMemo<AlertTierCounts>(() => {
        const result: AlertTierCounts = { critical: 0, warning: 0, advisory: 0 };
        for (const item of alerts) {
            result[getAlertSeverityTier(item)] += 1;
        }
        return result;
    }, [alerts]);

    const highestTier = useMemo<AlertSeverityTier | null>(() => {
        if (alerts.length === 0) return null;
        return getAlertSeverityTier(alerts[0]);
    }, [alerts]);

    const hasElevated = highestTier === "critical" || highestTier === "warning";
    const hasActiveTransient = Boolean(
        transientAlertId && alerts.some((a) => a.id === transientAlertId)
    );

    const isOverlayVisible =
        totalCount > 0 &&
        !isOverlayMinimized &&
        (hasElevated || isOverlayPinned || hasActiveTransient);

    const safeIndex = totalCount === 0 || currentIndex >= totalCount ? 0 : currentIndex;

    const activeAlert = useMemo(() => {
        if (totalCount === 0) return null;
        if (!hasElevated && !isOverlayPinned && transientAlertId) {
            const found = alerts.find((a) => a.id === transientAlertId);
            if (found) return found;
        }
        return alerts[safeIndex] ?? null;
    }, [alerts, totalCount, hasElevated, isOverlayPinned, transientAlertId, safeIndex]);

    const nextAlert = useCallback(() => {
        if (totalCount > 1) {
            setCurrentIndex((prev) => (prev + 1) % totalCount);
        }
    }, [totalCount]);

    const prevAlert = useCallback(() => {
        if (totalCount > 1) {
            setCurrentIndex((prev) => (prev - 1 + totalCount) % totalCount);
        }
    }, [totalCount]);

    const minimizeOverlay = useCallback(() => {
        setIsOverlayMinimized(true);
        setIsOverlayPinned(false);
        setTransientAlertId(null);
    }, []);

    const restoreOverlay = useCallback(() => {
        setIsOverlayMinimized(false);
        setIsOverlayPinned(true);
        setIsDrawerOpen(false);
        setCurrentIndex(0);
    }, []);

    const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

    const { mutate: acknowledgeMutate } = acknowledgeMutation;
    const acknowledgeAlert = useCallback(
        (id: string) => {
            acknowledgeMutate(id);
        },
        [acknowledgeMutate]
    );

    const dismissAll = useCallback(() => dismissAllForList(alerts), [dismissAllForList, alerts]);

    const acknowledgingId = acknowledgeMutation.isPending
        ? (acknowledgeMutation.variables ?? null)
        : null;

    const value = useMemo<LiveAlertsContextValue>(
        () => ({
            alerts,
            activeAlert,
            currentIndex: safeIndex,
            totalCount,
            highestTier,
            tierCounts,
            entityMap,
            isOverlayVisible,
            isOverlayMinimized,
            isDrawerOpen,
            acknowledgingId,
            alertConnected,
            emergencyConnected,
            nextAlert,
            prevAlert,
            minimizeOverlay,
            restoreOverlay,
            setOverlayInteracting: setIsOverlayInteracting,
            openDrawer,
            closeDrawer,
            setDrawerOpen: setIsDrawerOpen,
            acknowledgeAlert,
            dismissAlert,
            dismissAll,
        }),
        [
            alerts,
            activeAlert,
            safeIndex,
            totalCount,
            highestTier,
            tierCounts,
            entityMap,
            isOverlayVisible,
            isOverlayMinimized,
            isDrawerOpen,
            acknowledgingId,
            alertConnected,
            emergencyConnected,
            nextAlert,
            prevAlert,
            minimizeOverlay,
            restoreOverlay,
            openDrawer,
            closeDrawer,
            acknowledgeAlert,
            dismissAlert,
            dismissAll,
        ]
    );

    return <LiveAlertsContext.Provider value={value}>{children}</LiveAlertsContext.Provider>;
}

export function useLiveAlerts(): LiveAlertsContextValue {
    const context = useContext(LiveAlertsContext);
    if (!context) {
        throw new Error("useLiveAlerts must be used within LiveAlertsProvider");
    }
    return context;
}
