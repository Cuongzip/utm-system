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
    INCIDENT_STATUS,
    type LiveAlertItem,
    type LiveAlertSeverity,
    type PendingConfirmationVm,
    type AlertVm,
    type EmergencyIncidentVm,
} from "@/types";

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
        ? "VIEW FLIGHT"
        : alert.droneId
          ? "VIEW DRONE"
          : "VIEW CONFLICTS";

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
                ? "CONFIRM ACTION"
                : "MANAGE INCIDENT",
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
        status: "pending_confirmation",
        timestamp: pending.timeoutAt || new Date().toISOString(),
        actionUrl: "/dashboard/emergency",
        actionLabel: "CONFIRM ACTION",
        raw: pending,
    };
}

export function useLiveAlerts() {
    const queryClient = useQueryClient();

    const [alertConnected, setAlertConnected] = useState(false);
    const [emergencyConnected, setEmergencyConnected] = useState(false);

    const [alerts, setAlerts] = useState<LiveAlertItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());
    const dismissedIdsRef = useRef<Set<string>>(dismissedIds);

    const { data: initialAlerts = [] } = useActiveAlerts();
    const { data: initialIncidents = [] } = useEmergencyActiveIncidents();

    useEffect(() => {
        setAlerts((prev) => {
            const currentMap = new Map(prev.map((item) => [item.id, item]));

            for (const a of initialAlerts) {
                if (a.id && !dismissedIds.has(a.id)) {
                    if (a.status === ALERT_STATUS.RESOLVED || a.status === ALERT_STATUS.DISMISSED) {
                        currentMap.delete(a.id);
                    } else if (!currentMap.has(a.id)) {
                        currentMap.set(a.id, normalizeAlertItem(a));
                    }
                }
            }

            for (const inc of initialIncidents) {
                if (inc.id && !dismissedIds.has(inc.id)) {
                    if (inc.status === INCIDENT_STATUS.RESOLVED) {
                        currentMap.delete(inc.id);
                    } else if (!currentMap.has(inc.id)) {
                        currentMap.set(inc.id, normalizeIncidentItem(inc));
                    }
                }
            }

            const sorted = Array.from(currentMap.values()).sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            return sorted.slice(0, 50);
        });
    }, [initialAlerts, initialIncidents, dismissedIds]);

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
        const handleAlertMessage = (incoming: AlertVm) => {
            if (!incoming || !incoming.id) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alertsActive });

            if (
                incoming.status === ALERT_STATUS.RESOLVED ||
                incoming.status === ALERT_STATUS.DISMISSED
            ) {
                setAlerts((prev) => prev.filter((item) => item.id !== incoming.id));
                return;
            }

            if (dismissedIdsRef.current.has(incoming.id)) return;

            const normalized = normalizeAlertItem(incoming);
            setAlerts((prev) => {
                const filtered = prev.filter((item) => item.id !== normalized.id);
                return [normalized, ...filtered].slice(0, 50);
            });
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

            if (incoming.status === INCIDENT_STATUS.RESOLVED) {
                setAlerts((prev) => prev.filter((item) => item.id !== incoming.id));
                return;
            }

            if (dismissedIdsRef.current.has(incoming.id)) return;

            const normalized = normalizeIncidentItem(incoming);
            setAlerts((prev) => {
                const filtered = prev.filter((item) => item.id !== normalized.id);
                return [normalized, ...filtered].slice(0, 50);
            });
        };

        const handleEmergencyPending = (incoming: PendingConfirmationVm) => {
            if (!incoming) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });

            const normalized = normalizePendingItem(incoming);
            if (dismissedIdsRef.current.has(normalized.id)) return;

            setAlerts((prev) => {
                const filtered = prev.filter((item) => item.id !== normalized.id);
                return [normalized, ...filtered].slice(0, 50);
            });
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
        dismissedIdsRef.current.add(id);
        setDismissedIds(new Set(dismissedIdsRef.current));
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        setCurrentIndex(0);
    }, []);

    const dismissAll = useCallback(() => {
        alerts.forEach((a) => dismissedIdsRef.current.add(a.id));
        setDismissedIds(new Set(dismissedIdsRef.current));
        setAlerts([]);
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
