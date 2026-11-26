"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    connectServiceStomp,
    subscribeServiceStomp,
    onServiceStompConnectionChange,
} from "@/lib/stomp";
import { QUERY_KEYS, useActiveAlerts, useEmergencyActiveIncidents } from "@/hooks/useQueries";
import {
    ALERT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    INCIDENT_STATUS,
    type LiveAlertItem,
    type LiveAlertSeverity,
    type PendingConfirmationVm,
    type AlertVm,
    type EmergencyIncidentVm,
} from "@/types";

const DISMISSED_STORAGE_KEY = "utm:dismissed-live-alerts";
const STALE_ALERT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

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
    if (s === "CRITICAL") return "CRITICAL";
    if (s === "HIGH") return "HIGH";
    if (s === "MEDIUM") return "MEDIUM";
    if (s === "LOW") return "LOW";
    return "INFO";
}

function normalizeEmergencySeverity(sev?: string): LiveAlertSeverity {
    const s = (sev || "").toLowerCase();
    if (s === "emergency") return "EMERGENCY";
    if (s === "critical") return "CRITICAL";
    if (s === "warning") return "WARNING";
    return "EMERGENCY";
}

function normalizeAlertItem(alert: AlertVm): LiveAlertItem {
    const actionUrl = alert.flightId
        ? "/dashboard/flights"
        : alert.droneId
          ? "/dashboard/drones"
          : "/dashboard/conflicts";

    const actionLabel = alert.flightId
        ? "View Flight"
        : alert.droneId
          ? "View Drone"
          : "View Conflicts";

    return {
        id: alert.id,
        source: "alert",
        severity: normalizeAlertSeverity(alert.severity),
        title: alert.alertType?.replace(/_/g, " ").toUpperCase() || "AIRSPACE ALERT",
        message:
            alert.message ||
            (alert.alertType ? `Alert detected: ${alert.alertType}` : "Airspace anomaly reported"),
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

function normalizeIncidentItem(incident: EmergencyIncidentVm): LiveAlertItem {
    return {
        id: incident.id,
        source: "emergency",
        severity: normalizeEmergencySeverity(incident.severity),
        title: incident.emergencyType
            ? incident.emergencyType.replace(/_/g, " ").toUpperCase()
            : "EMERGENCY INCIDENT",
        message:
            incident.message ||
            `Drone ${incident.droneId || "N/A"} failsafe action required: ${incident.responseAction || "EMERGENCY"}`,
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

function normalizePendingItem(pending: PendingConfirmationVm): LiveAlertItem {
    const id = pending.incidentId || pending.incident?.id || `pending-${Date.now()}`;
    return {
        id,
        source: "emergency",
        severity: "EMERGENCY",
        title: `CONFIRMATION REQUIRED: ${(pending.protocol?.name || pending.incident?.emergencyType || "Emergency Protocol").toUpperCase().replace(/_/g, " ")}`,
        message: `Failsafe action ${pending.protocol?.responseAction || "REQUIRED"} awaiting operator confirmation for Drone ${pending.incident?.droneId || "N/A"}`,
        droneId: pending.incident?.droneId,
        flightId: pending.incident?.flightId,
        status: INCIDENT_STATUS.PENDING_CONFIRMATION,
        timestamp: pending.timeoutAt || new Date().toISOString(),
        actionUrl: "/dashboard/emergency",
        actionLabel: "Confirm Action",
        raw: pending,
    };
}

export function useLiveAlerts() {
    const queryClient = useQueryClient();

    const [alertConnected, setAlertConnected] = useState(false);
    const [emergencyConnected, setEmergencyConnected] = useState(false);

    const [realtimeMap, setRealtimeMap] = useState<Map<string, LiveAlertItem>>(() => new Map());
    const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
        readPersistedDismissedIds()
    );
    const dismissedIdsRef = useRef<Set<string>>(dismissedIds);

    useEffect(() => {
        dismissedIdsRef.current = dismissedIds;
    }, [dismissedIds]);

    const { data: initialAlerts = [] } = useActiveAlerts();
    const { data: initialIncidents = [] } = useEmergencyActiveIncidents();

    const alerts = useMemo(() => {
        const merged = new Map<string, LiveAlertItem>();
        const activeIncidentIds = new Set<string>();

        for (const inc of initialIncidents) {
            if (!inc.id || dismissedIds.has(inc.id) || removedIds.has(inc.id)) continue;
            if (CLOSED_INCIDENT_STATUSES.includes(inc.status)) continue;
            const isPending = inc.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
            if (!isFreshAlert(inc.detectedAt || inc.createdOn, isPending)) continue;

            activeIncidentIds.add(inc.id);
            merged.set(inc.id, normalizeIncidentItem(inc));
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

            merged.set(a.id, normalizeAlertItem(a));
        }

        for (const [id, item] of realtimeMap.entries()) {
            if (dismissedIds.has(id) || removedIds.has(id)) continue;
            if (item.source === "alert" && item.raw && typeof item.raw === "object") {
                const rawAlert = item.raw as Record<string, unknown>;
                const linkedIncidentId =
                    typeof rawAlert.incidentId === "string" ? rawAlert.incidentId : undefined;
                if (linkedIncidentId && activeIncidentIds.has(linkedIncidentId)) continue;
            }
            merged.set(id, item);
        }

        return Array.from(merged.values())
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50);
    }, [initialAlerts, initialIncidents, realtimeMap, dismissedIds, removedIds]);

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
        const markRemoved = (id: string) => {
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
        };

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
            upsertRealtime(normalizeAlertItem(incoming));
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
    }, [queryClient]);

    const totalCount = alerts.length;

    const safeIndex = useMemo(() => {
        if (totalCount === 0) return 0;
        if (currentIndex >= totalCount) return 0;
        return currentIndex;
    }, [currentIndex, totalCount]);

    const activeAlert = useMemo(() => {
        return alerts[safeIndex] || null;
    }, [alerts, safeIndex]);

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

    const dismissAlert = useCallback((id: string) => {
        const next = new Set(dismissedIdsRef.current);
        next.add(id);
        dismissedIdsRef.current = next;
        persistDismissedIds(next);
        setDismissedIds(next);
        setCurrentIndex(0);
    }, []);

    const dismissAll = useCallback(() => {
        const next = new Set(dismissedIdsRef.current);
        alerts.forEach((a) => next.add(a.id));
        dismissedIdsRef.current = next;
        persistDismissedIds(next);
        setDismissedIds(next);
        setCurrentIndex(0);
    }, [alerts]);

    return {
        alerts,
        activeAlert,
        currentIndex: safeIndex,
        totalCount,
        nextAlert,
        prevAlert,
        dismissAlert,
        dismissAll,
        alertConnected,
        emergencyConnected,
    };
}
