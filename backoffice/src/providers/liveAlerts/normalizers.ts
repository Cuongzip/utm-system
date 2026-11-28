import type { AppLocale } from "@/i18n";
import { localizeResponseAction, localizeServerText, resolveEntityReferences } from "@/utils";
import {
    EMERGENCY_SEVERITY,
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

const STALE_ALERT_MAX_AGE_MS = 2 * 60 * 60 * 1000;

const TERMINAL_ALERT_FLIGHT_STATUSES: readonly FlightStatus[] = [
    FLIGHT_STATUS.COMPLETED,
    FLIGHT_STATUS.EMERGENCY_LANDING,
    FLIGHT_STATUS.CANCELLED,
];

export interface AlertLocalizeContext {
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

export function isFreshAlert(timestampIso?: string, alwaysKeep = false): boolean {
    if (alwaysKeep || !timestampIso) return true;
    const parsed = Date.parse(timestampIso);
    if (Number.isNaN(parsed)) return true;
    return Date.now() - parsed <= STALE_ALERT_MAX_AGE_MS;
}

function normalizeAlertSeverity(sev?: string): LiveAlertSeverity {
    const s = (sev ?? "").toUpperCase();
    if (s === LIVE_ALERT_SEVERITY.CRITICAL) return LIVE_ALERT_SEVERITY.CRITICAL;
    if (s === LIVE_ALERT_SEVERITY.HIGH) return LIVE_ALERT_SEVERITY.HIGH;
    if (s === LIVE_ALERT_SEVERITY.MEDIUM) return LIVE_ALERT_SEVERITY.MEDIUM;
    if (s === LIVE_ALERT_SEVERITY.LOW) return LIVE_ALERT_SEVERITY.LOW;
    return LIVE_ALERT_SEVERITY.INFO;
}

function normalizeEmergencySeverity(sev?: string): LiveAlertSeverity {
    const s = (sev ?? "").toLowerCase();
    if (s === EMERGENCY_SEVERITY.EMERGENCY) return LIVE_ALERT_SEVERITY.EMERGENCY;
    if (s === EMERGENCY_SEVERITY.CRITICAL) return LIVE_ALERT_SEVERITY.CRITICAL;
    if (s === EMERGENCY_SEVERITY.WARNING) return LIVE_ALERT_SEVERITY.WARNING;
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

export function normalizeAlertItem(
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
        timestamp: alert.createdOn ?? alert.acknowledgedAt ?? new Date().toISOString(),
        actionUrl,
        actionLabel,
        raw: alert,
    };
}

export function normalizeIncidentItem(
    incident: EmergencyIncidentVm,
    ctx?: AlertLocalizeContext
): LiveAlertItem {
    const droneLabel = resolveDroneLabel(incident.droneId, ctx?.entityMap);
    const actionLabelText = localizeResponseAction(
        incident.responseAction ?? "EMERGENCY",
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
        timestamp: incident.detectedAt ?? incident.createdOn ?? new Date().toISOString(),
        actionUrl: "/dashboard/emergency",
        actionLabel:
            incident.status === INCIDENT_STATUS.PENDING_CONFIRMATION
                ? "Confirm Action"
                : "Manage Incident",
        raw: incident,
    };
}

export function normalizePendingItem(
    pending: PendingConfirmationVm,
    ctx?: AlertLocalizeContext
): LiveAlertItem {
    const id = pending.incidentId || pending.incident?.id || `pending-${Date.now()}`;
    const rawProto =
        pending.protocol?.name || pending.incident?.emergencyType || "Emergency Protocol";
    const protoText = rawProto.replace(/_/g, " ").toUpperCase();
    const droneLabel = resolveDroneLabel(pending.incident?.droneId, ctx?.entityMap);
    const actionLabelText = localizeResponseAction(
        pending.protocol?.responseAction ?? pending.incident?.responseAction ?? "LAND",
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

export function relocalizeLiveItem(
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
