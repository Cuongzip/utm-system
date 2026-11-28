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
import {
    connectServiceStomp,
    onServiceStompConnectionChange,
    subscribeServiceStomp,
} from "@/lib/stomp";
import { useAppLocale, type AppLocale } from "@/i18n";
import { localizeResponseAction, localizeServerText, resolveEntityReferences } from "@/utils";
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
    FLIGHT_STATUS,
    INCIDENT_STATUS,
    LIVE_ALERT_SEVERITY,
    type AlertVm,
    type EmergencyIncidentVm,
    type FlightStatus,
    type LiveAlertItem,
    type LiveAlertSeverity,
    type PendingConfirmationVm,
} from "@/types";
import {
    getAlertPriorityRank,
    getAlertSeverityTier,
    isElevatedAlert,
    type AlertSeverityTier,
    type AlertTierCounts,
} from "@/components/alerts/alertUtils";

const DISMISSED_STORAGE_KEY = "utm:dismissed-live-alerts";
const STALE_ALERT_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const TRANSIENT_OVERLAY_MS = 8000;

const TERMINAL_ALERT_FLIGHT_STATUSES: readonly FlightStatus[] = [
    FLIGHT_STATUS.COMPLETED,
    FLIGHT_STATUS.EMERGENCY_LANDING,
    FLIGHT_STATUS.CANCELLED,
];

interface AlertLocalizeContext {
    locale: AppLocale;
    entityMap: ReadonlyMap<string, string>;
    fallbackAlertTitle: string;
    fallbackAirspaceAnomaly: string;
    fallbackEmergencyTitle: string;
    formatAlertDetected: (type: string) => string;
    formatFailsafeRequired: (drone: string, action: string) => string;
    formatConfirmTitle: (protocol: string) => string;
    formatConfirmMessage: (action: string, drone: string) => string;
}

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
        // Ignore storage quota errors
    }
}

function isFreshAlert(timestampIso?: string, alwaysKeep = false): boolean {
    if (alwaysKeep || !timestampIso) return true;
    const parsed = Date.parse(timestampIso);
    if (Number.isNaN(parsed)) return true;
    return Date.now() - parsed <= STALE_ALERT_MAX_AGE_MS;
}

function normalizeAlertSeverity(sev?: string): LiveAlertSeverity {
    const s = (sev || "").toUpperCase();
    if (s === LIVE_ALERT_SEVERITY.CRITICAL) return LIVE_ALERT_SEVERITY.CRITICAL;
    if (s === LIVE_ALERT_SEVERITY.HIGH) return LIVE_ALERT_SEVERITY.HIGH;
    if (s === LIVE_ALERT_SEVERITY.MEDIUM) return LIVE_ALERT_SEVERITY.MEDIUM;
    if (s === LIVE_ALERT_SEVERITY.LOW) return LIVE_ALERT_SEVERITY.LOW;
    return LIVE_ALERT_SEVERITY.INFO;
}

function normalizeEmergencySeverity(sev?: string): LiveAlertSeverity {
    const s = (sev || "").toLowerCase();
    if (s === "emergency") return LIVE_ALERT_SEVERITY.EMERGENCY;
    if (s === "critical") return LIVE_ALERT_SEVERITY.CRITICAL;
    if (s === "warning") return LIVE_ALERT_SEVERITY.WARNING;
    return LIVE_ALERT_SEVERITY.EMERGENCY;
}

function resolveDroneLabel(
    droneId: string | undefined,
    entityMap?: ReadonlyMap<string, string>
): string {
    if (!droneId) return "N/A";
    const mapped = entityMap?.get(droneId) ?? entityMap?.get(droneId.toLowerCase());
    if (mapped) return mapped;
    return droneId.length > 12 ? `DRN-${droneId.slice(0, 8).toUpperCase()}` : droneId;
}

function normalizeAlertItem(
    alert: AlertVm,
    flightStatusMap?: ReadonlyMap<string, FlightStatus | undefined>,
    ctx?: AlertLocalizeContext
): LiveAlertItem {
    const knownStatus = alert.flightId ? flightStatusMap?.get(alert.flightId) : undefined;
    const isTerminalFlight = Boolean(
        knownStatus && TERMINAL_ALERT_FLIGHT_STATUSES.includes(knownStatus)
    );
    const actionUrl = alert.flightId
        ? isTerminalFlight
            ? `/dashboard/flights/${alert.flightId}`
            : `/dashboard/flights/${alert.flightId}/cockpit`
        : alert.droneId
          ? "/dashboard/drones"
          : "/dashboard/conflicts";

    const actionLabel = alert.flightId
        ? "View Flight"
        : alert.droneId
          ? "View Drone"
          : "View Conflicts";

    const cleanType = alert.alertType ? alert.alertType.replace(/_/g, " ").toUpperCase() : "";
    const message = alert.message
        ? ctx
            ? localizeServerText(alert.message, ctx.locale, { entityMap: ctx.entityMap })
            : resolveEntityReferences(alert.message)
        : cleanType
          ? (ctx?.formatAlertDetected(cleanType) ?? `Alert detected: ${cleanType}`)
          : (ctx?.fallbackAirspaceAnomaly ?? "Airspace anomaly reported");

    return {
        id: alert.id,
        source: "alert",
        severity: normalizeAlertSeverity(alert.severity),
        title: cleanType || (ctx?.fallbackAlertTitle ?? "AIRSPACE ALERT"),
        message,
        droneId: alert.droneId,
        flightId: alert.flightId,
        hubId: alert.hubId,
        status: alert.status,
        timestamp: alert.createdOn || alert.acknowledgedAt || new Date().toISOString(),
        actionUrl,
        actionLabel,
        raw: alert,
    };
}

function normalizeIncidentItem(
    incident: EmergencyIncidentVm,
    ctx?: AlertLocalizeContext
): LiveAlertItem {
    const droneLabel = resolveDroneLabel(incident.droneId, ctx?.entityMap);
    const actionLabelText = localizeResponseAction(
        incident.responseAction || "EMERGENCY",
        ctx?.locale ?? "en",
        true
    );
    const message = incident.message
        ? ctx
            ? localizeServerText(incident.message, ctx.locale, { entityMap: ctx.entityMap })
            : resolveEntityReferences(incident.message)
        : ctx
          ? ctx.formatFailsafeRequired(droneLabel, actionLabelText)
          : `Aircraft ${droneLabel} requires failsafe action: ${actionLabelText}`;

    return {
        id: incident.id,
        source: "emergency",
        severity: normalizeEmergencySeverity(incident.severity),
        title: incident.emergencyType
            ? incident.emergencyType.replace(/_/g, " ").toUpperCase()
            : (ctx?.fallbackEmergencyTitle ?? "EMERGENCY INCIDENT"),
        message,
        droneId: incident.droneId,
        flightId: incident.flightId,
        status: incident.status,
        timestamp: incident.detectedAt || incident.createdOn || new Date().toISOString(),
        actionUrl: "/dashboard/emergency",
        actionLabel:
            incident.status === INCIDENT_STATUS.PENDING_CONFIRMATION
                ? "Confirm Action"
                : "Manage Incident",
        raw: incident,
    };
}

function normalizePendingItem(
    pending: PendingConfirmationVm,
    ctx?: AlertLocalizeContext
): LiveAlertItem {
    const id = pending.incidentId || pending.incident?.id || `pending-${Date.now()}`;
    const rawProto =
        pending.protocol?.name || pending.incident?.emergencyType || "Emergency Protocol";
    const protoText = rawProto.replace(/_/g, " ").toUpperCase();
    const droneLabel = resolveDroneLabel(pending.incident?.droneId, ctx?.entityMap);
    const actionLabelText = localizeResponseAction(
        pending.protocol?.responseAction || pending.incident?.responseAction || "LAND",
        ctx?.locale ?? "en",
        true
    );

    return {
        id,
        source: "emergency",
        severity: LIVE_ALERT_SEVERITY.EMERGENCY,
        title: ctx ? ctx.formatConfirmTitle(protoText) : `CONFIRMATION REQUIRED: ${protoText}`,
        message: ctx
            ? ctx.formatConfirmMessage(actionLabelText, droneLabel)
            : `Failsafe action ${actionLabelText} awaiting operator confirmation for aircraft ${droneLabel}`,
        droneId: pending.incident?.droneId,
        flightId: pending.incident?.flightId,
        status: INCIDENT_STATUS.PENDING_CONFIRMATION,
        timestamp: pending.timeoutAt || new Date().toISOString(),
        actionUrl: "/dashboard/emergency",
        actionLabel: "Confirm Action",
        raw: pending,
    };
}

function relocalizeLiveItem(
    item: LiveAlertItem,
    flightStatusMap: ReadonlyMap<string, FlightStatus | undefined>,
    ctx: AlertLocalizeContext
): LiveAlertItem {
    if (item.source === "alert" && item.raw && typeof item.raw === "object") {
        return normalizeAlertItem(item.raw as AlertVm, flightStatusMap, ctx);
    }
    if (item.source === "emergency" && item.raw && typeof item.raw === "object") {
        if ("incident" in (item.raw as Record<string, unknown>)) {
            return normalizePendingItem(item.raw as PendingConfirmationVm, ctx);
        }
        return normalizeIncidentItem(item.raw as EmergencyIncidentVm, ctx);
    }
    return {
        ...item,
        message: localizeServerText(item.message, ctx.locale, { entityMap: ctx.entityMap }),
    };
}

export interface LiveAlertsContextValue {
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

    const [alertConnected, setAlertConnected] = useState(false);
    const [emergencyConnected, setEmergencyConnected] = useState(false);

    const [realtimeMap, setRealtimeMap] = useState<Map<string, LiveAlertItem>>(() => new Map());
    const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
        readPersistedDismissedIds()
    );
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

    const dismissedIdsRef = useRef<Set<string>>(dismissedIds);
    useEffect(() => {
        dismissedIdsRef.current = dismissedIds;
    }, [dismissedIds]);

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
            if (!isFreshAlert(inc.detectedAt || inc.createdOn, isPending)) continue;

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

            const rawRecord = a as Record<string, unknown>;
            const linkedIncidentId =
                typeof rawRecord.incidentId === "string" ? rawRecord.incidentId : undefined;
            if (linkedIncidentId && activeIncidentIds.has(linkedIncidentId)) continue;

            merged.set(a.id, normalizeAlertItem(a, flightStatusMap, localizeCtx));
        }

        for (const [id, item] of realtimeMap.entries()) {
            if (dismissedIds.has(id) || removedIds.has(id)) continue;
            if (item.source === "alert" && item.raw && typeof item.raw === "object") {
                const rawAlert = item.raw as Record<string, unknown>;
                const linkedIncidentId =
                    typeof rawAlert.incidentId === "string" ? rawAlert.incidentId : undefined;
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
        connectServiceStomp("alert");
        connectServiceStomp("emergency");

        const unsubAlert = onServiceStompConnectionChange("alert", setAlertConnected);
        const unsubEmerg = onServiceStompConnectionChange("emergency", setEmergencyConnected);

        return () => {
            unsubAlert();
            unsubEmerg();
        };
    }, []);

    useEffect(() => {
        const upsertRealtime = (normalized: LiveAlertItem) => {
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
        };

        const handleAlertMessage = (incoming: AlertVm) => {
            if (!incoming || !incoming.id) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alertsActive });

            if (
                incoming.status === ALERT_STATUS.RESOLVED ||
                incoming.status === ALERT_STATUS.DISMISSED ||
                incoming.status === ALERT_STATUS.ACKNOWLEDGED
            ) {
                markRemoved(incoming.id);
                return;
            }

            if (dismissedIdsRef.current.has(incoming.id)) return;
            upsertRealtime(normalizeAlertItem(incoming, flightStatusMapRef.current));
        };

        const unsubLiveAlerts = subscribeServiceStomp<AlertVm>(
            "alert",
            "/topic/alerts/live",
            (data) => handleAlertMessage(data)
        );

        const handleEmergencyIncident = (incoming: EmergencyIncidentVm) => {
            if (!incoming || !incoming.id) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyStats });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });

            if (CLOSED_INCIDENT_STATUSES.includes(incoming.status)) {
                markRemoved(incoming.id);
                return;
            }

            if (dismissedIdsRef.current.has(incoming.id)) return;
            upsertRealtime(normalizeIncidentItem(incoming));
        };

        const handleEmergencyPending = (incoming: PendingConfirmationVm) => {
            if (!incoming) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });

            const normalized = normalizePendingItem(incoming);
            if (dismissedIdsRef.current.has(normalized.id)) return;
            upsertRealtime(normalized);
        };

        const unsubIncidents = subscribeServiceStomp<EmergencyIncidentVm>(
            "emergency",
            "/topic/emergency/incidents",
            (data) => handleEmergencyIncident(data)
        );

        const unsubPending = subscribeServiceStomp<PendingConfirmationVm>(
            "emergency",
            "/topic/emergency/pending",
            (data) => handleEmergencyPending(data)
        );

        return () => {
            unsubLiveAlerts();
            unsubIncidents();
            unsubPending();
        };
    }, [queryClient, markRemoved]);

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

    const safeIndex = useMemo(() => {
        if (totalCount === 0) return 0;
        if (currentIndex >= totalCount) return 0;
        return currentIndex;
    }, [currentIndex, totalCount]);

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

    const acknowledgeAlert = useCallback(
        (id: string) => {
            acknowledgeMutation.mutate(id);
        },
        [acknowledgeMutation]
    );

    const dismissAlert = useCallback((id: string) => {
        const next = new Set(dismissedIdsRef.current);
        next.add(id);
        dismissedIdsRef.current = next;
        persistDismissedIds(next);
        setDismissedIds(next);
        setTransientAlertId((prev) => (prev === id ? null : prev));
        setCurrentIndex(0);
    }, []);

    const dismissAll = useCallback(() => {
        const next = new Set(dismissedIdsRef.current);
        alerts.forEach((a) => next.add(a.id));
        dismissedIdsRef.current = next;
        persistDismissedIds(next);
        setDismissedIds(next);
        setTransientAlertId(null);
        setCurrentIndex(0);
    }, [alerts]);

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
