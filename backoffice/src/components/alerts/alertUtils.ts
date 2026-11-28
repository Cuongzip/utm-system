import type { AppLocale } from "@/i18n";
import { localizeAlertTypeTitle, localizeServerText } from "@/utils/format/localizeServerText";
import {
    INCIDENT_STATUS,
    LIVE_ALERT_SEVERITY,
    type LiveAlertItem,
    type LiveAlertSeverity,
} from "@/types";

export type AlertSeverityTier = "critical" | "warning" | "advisory";

export interface AlertTierCounts {
    critical: number;
    warning: number;
    advisory: number;
}

export interface ResolvedAlertEntities {
    flightCode: string | null;
    droneCode: string | null;
}

export const IS_COCKPIT_PATH_RE = /^\/dashboard\/flights\/[^/]+\/cockpit(?:\/|$)/;

export function getAlertPriorityRank(item: Pick<LiveAlertItem, "severity" | "status">): number {
    if (item.status === INCIDENT_STATUS.PENDING_CONFIRMATION) {
        return 0;
    }
    switch (item.severity) {
        case LIVE_ALERT_SEVERITY.EMERGENCY:
            return 1;
        case LIVE_ALERT_SEVERITY.CRITICAL:
            return 2;
        case LIVE_ALERT_SEVERITY.HIGH:
            return 3;
        case LIVE_ALERT_SEVERITY.WARNING:
            return 4;
        case LIVE_ALERT_SEVERITY.MEDIUM:
            return 5;
        case LIVE_ALERT_SEVERITY.LOW:
            return 6;
        case LIVE_ALERT_SEVERITY.INFO:
        default:
            return 7;
    }
}

export function getAlertSeverityTier(
    item: Pick<LiveAlertItem, "severity" | "status">
): AlertSeverityTier {
    const rank = getAlertPriorityRank(item);
    if (rank <= 2) return "critical";
    if (rank <= 4) return "warning";
    return "advisory";
}

export function getAlertSeverityStatus(severity: LiveAlertSeverity, status?: string): string {
    if (status === INCIDENT_STATUS.PENDING_CONFIRMATION) {
        return "emergency";
    }
    switch (severity) {
        case LIVE_ALERT_SEVERITY.EMERGENCY:
            return "emergency";
        case LIVE_ALERT_SEVERITY.CRITICAL:
            return "critical";
        case LIVE_ALERT_SEVERITY.HIGH:
        case LIVE_ALERT_SEVERITY.WARNING:
            return "warning";
        case LIVE_ALERT_SEVERITY.MEDIUM:
        case LIVE_ALERT_SEVERITY.LOW:
        case LIVE_ALERT_SEVERITY.INFO:
        default:
            return "advisory";
    }
}

export function isElevatedAlert(item: Pick<LiveAlertItem, "severity" | "status">): boolean {
    return getAlertPriorityRank(item) <= 4;
}

export function formatAlertTypeLabel(rawTitle: string, locale: AppLocale): string {
    const trimmed = rawTitle.trim();
    if (!trimmed) return "";

    const confirmMatch = /^(CONFIRMATION REQUIRED|YÊU CẦU XÁC NHẬN):\s*(.+)$/i.exec(trimmed);
    if (confirmMatch) {
        const rawProto = confirmMatch[2].trim();
        const protoKey = rawProto.toUpperCase().replace(/[\s-]+/g, "_");
        let localizedProto: string;
        if (locale === "vi") {
            const mappedProto = localizeAlertTypeTitle(protoKey, "vi");
            localizedProto =
                mappedProto !== protoKey
                    ? mappedProto
                    : localizeServerText(rawProto.replace(/_/g, " "), "vi").toUpperCase();
        } else {
            localizedProto = rawProto.replace(/_/g, " ").toUpperCase();
        }
        const prefix = locale === "vi" ? "YÊU CẦU XÁC NHẬN" : "CONFIRMATION REQUIRED";
        return `${prefix}: ${localizedProto}`;
    }

    const normalizedKey = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
    if (locale === "vi") {
        const mapped = localizeAlertTypeTitle(normalizedKey, "vi");
        if (mapped !== normalizedKey) {
            return mapped;
        }
        return localizeServerText(trimmed.replace(/_/g, " "), "vi").toUpperCase();
    }

    return trimmed.replace(/_/g, " ").toUpperCase();
}

export function resolveAlertEntities(
    item: Pick<LiveAlertItem, "flightId" | "droneId">,
    entityMap: ReadonlyMap<string, string>
): ResolvedAlertEntities {
    const flightCode = item.flightId
        ? (entityMap.get(item.flightId) ??
          entityMap.get(item.flightId.toLowerCase()) ??
          (item.flightId.length > 12
              ? `FLT-${item.flightId.slice(0, 8).toUpperCase()}`
              : item.flightId))
        : null;

    const droneCode = item.droneId
        ? (entityMap.get(item.droneId) ??
          entityMap.get(item.droneId.toLowerCase()) ??
          (item.droneId.length > 12
              ? `DRN-${item.droneId.slice(0, 8).toUpperCase()}`
              : item.droneId))
        : null;

    return { flightCode, droneCode };
}
