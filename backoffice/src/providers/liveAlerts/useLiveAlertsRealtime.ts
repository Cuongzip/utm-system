"use client";

import { useCallback, type MutableRefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS, useStomp, useStompSubscription } from "@/hooks";
import {
    ALERT_STATUS,
    CLOSED_INCIDENT_STATUSES,
    type AlertVm,
    type EmergencyIncidentVm,
    type FlightStatus,
    type LiveAlertItem,
    type PendingConfirmationVm,
} from "@/types";
import { normalizeAlertItem, normalizeIncidentItem, normalizePendingItem } from "./normalizers";

interface UseLiveAlertsRealtimeOptions {
    dismissedIdsRef: MutableRefObject<Set<string>>;
    flightStatusMapRef: MutableRefObject<Map<string, FlightStatus | undefined>>;
    onUpsertRealtime: (item: LiveAlertItem) => void;
    onMarkRemoved: (id: string) => void;
}

export function useLiveAlertsRealtime({
    dismissedIdsRef,
    flightStatusMapRef,
    onUpsertRealtime,
    onMarkRemoved,
}: UseLiveAlertsRealtimeOptions) {
    const queryClient = useQueryClient();
    const { isConnected: alertConnected } = useStomp({ service: "alert" });
    const { isConnected: emergencyConnected } = useStomp({ service: "emergency" });

    const handleAlertMessage = useCallback(
        (incoming: AlertVm) => {
            if (!incoming || !incoming.id) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.alertsActive });

            if (
                incoming.status === ALERT_STATUS.RESOLVED ||
                incoming.status === ALERT_STATUS.DISMISSED ||
                incoming.status === ALERT_STATUS.ACKNOWLEDGED
            ) {
                onMarkRemoved(incoming.id);
                return;
            }

            if (dismissedIdsRef.current.has(incoming.id)) return;
            onUpsertRealtime(normalizeAlertItem(incoming, flightStatusMapRef.current));
        },
        [queryClient, dismissedIdsRef, flightStatusMapRef, onMarkRemoved, onUpsertRealtime]
    );

    const handleEmergencyIncident = useCallback(
        (incoming: EmergencyIncidentVm) => {
            if (!incoming || !incoming.id) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyStats });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });

            if (CLOSED_INCIDENT_STATUSES.includes(incoming.status)) {
                onMarkRemoved(incoming.id);
                return;
            }

            if (dismissedIdsRef.current.has(incoming.id)) return;
            onUpsertRealtime(normalizeIncidentItem(incoming));
        },
        [queryClient, dismissedIdsRef, onMarkRemoved, onUpsertRealtime]
    );

    const handleEmergencyPending = useCallback(
        (incoming: PendingConfirmationVm) => {
            if (!incoming) return;
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyPending });

            const normalized = normalizePendingItem(incoming);
            if (dismissedIdsRef.current.has(normalized.id)) return;
            onUpsertRealtime(normalized);
        },
        [queryClient, dismissedIdsRef, onUpsertRealtime]
    );

    useStompSubscription<AlertVm>("/topic/alerts/live", handleAlertMessage, true, "alert");
    useStompSubscription<EmergencyIncidentVm>(
        "/topic/emergency/incidents",
        handleEmergencyIncident,
        true,
        "emergency"
    );
    useStompSubscription<PendingConfirmationVm>(
        "/topic/emergency/pending",
        handleEmergencyPending,
        true,
        "emergency"
    );

    return { alertConnected, emergencyConnected };
}
