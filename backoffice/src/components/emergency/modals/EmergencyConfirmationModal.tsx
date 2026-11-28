"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertOctagon, AlertTriangle, Check, Clock, ShieldAlert } from "lucide-react";
import { Modal, ChamferButton, StatusBadge, TacticalCallout } from "@/components/ui";
import { useAppLocale } from "@/i18n";
import { useDronesAll, useEntityCodeMap, useFlightsAll } from "@/hooks";
import { formatDuration, localizeResponseAction, localizeServerText } from "@/utils";
import {
    EMERGENCY_SEVERITY,
    EMERGENCY_TYPES,
    RESPONSE_ACTION,
    RESPONSE_ACTIONS,
    type EmergencyType,
    type PendingConfirmationVm,
    type ResponseAction,
} from "@/types";

export interface EmergencyConfirmationModalProps {
    isOpen: boolean;
    pendingConfirmations: PendingConfirmationVm[];
    onClose: () => void;
    onConfirmAction: (incidentId: string, approved: boolean) => void;
    submitting?: boolean;
}

export function EmergencyConfirmationModal({
    isOpen,
    pendingConfirmations,
    onClose,
    onConfirmAction,
    submitting = false,
}: EmergencyConfirmationModalProps) {
    const t = useTranslations("emergency");
    const locale = useAppLocale();
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();
    const entityMap = useEntityCodeMap();
    const [nowMs, setNowMs] = useState(() => Date.now());

    const current = pendingConfirmations[0] ?? null;

    useEffect(() => {
        if (!isOpen || !current) return;
        const timer = setInterval(() => setNowMs(Date.now()), 500);
        return () => clearInterval(timer);
    }, [isOpen, current]);

    const droneMap = useMemo(
        () =>
            new Map(
                drones
                    .filter((d) => d.id)
                    .map((d) => [d.id, d.registrationNumber || d.model || d.id])
            ),
        [drones]
    );

    const flightMap = useMemo(
        () => new Map(flights.filter((f) => f.id).map((f) => [f.id, f])),
        [flights]
    );

    if (!isOpen || !current) return null;

    const { incident, protocol, timeoutAt } = current;
    const totalTimeoutSec = Math.max(protocol?.confirmationTimeoutSeconds ?? 30, 1);
    const timeoutIso = timeoutAt || incident.confirmationTimeoutAt;
    const remainingSec = timeoutIso
        ? Math.max(0, Math.ceil((new Date(timeoutIso).getTime() - nowMs) / 1000))
        : totalTimeoutSec;
    const progressPct = Math.min(100, Math.max(0, (remainingSec / totalTimeoutSec) * 100));

    const severity = incident.severity ?? EMERGENCY_SEVERITY.WARNING;
    const isUrgent = remainingSec <= 10;
    const SeverityIcon =
        severity === EMERGENCY_SEVERITY.EMERGENCY
            ? AlertOctagon
            : severity === EMERGENCY_SEVERITY.CRITICAL
              ? ShieldAlert
              : AlertTriangle;

    const flight = incident.flightId ? flightMap.get(incident.flightId) : undefined;
    const flightLabel =
        flight?.flightNumber ||
        (incident.flightId && incident.flightId.length > 12
            ? `FLT-${incident.flightId.slice(0, 8).toUpperCase()}`
            : incident.flightId);
    const effectiveDroneId = incident.droneId || flight?.droneId;
    const droneLabel = effectiveDroneId
        ? droneMap.get(effectiveDroneId) ||
          (effectiveDroneId.length > 12
              ? `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
              : effectiveDroneId)
        : t("activeList.unknownDrone");

    const proposedAction =
        incident.responseAction ?? protocol?.responseAction ?? RESPONSE_ACTION.NONE;
    const actionDescription = (RESPONSE_ACTIONS as readonly string[]).includes(proposedAction)
        ? t(`actionDescriptions.${proposedAction as ResponseAction}`)
        : proposedAction;
    const remainingQueueCount = Math.max(0, pendingConfirmations.length - 1);
    const typeLabel =
        incident.emergencyType &&
        (EMERGENCY_TYPES as readonly string[]).includes(incident.emergencyType)
            ? t(`types.${incident.emergencyType as EmergencyType}`)
            : incident.emergencyType?.replace(/_/g, " ") || "—";

    const footer = (
        <div className="flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-2">
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                >
                    {t("modals.confirm.dismiss")}
                </ChamferButton>
                {remainingQueueCount > 0 && (
                    <span className="text-[11px] font-mono text-slate-500">
                        {t("modals.confirm.morePending", { count: remainingQueueCount })}
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    type="button"
                    disabled={submitting}
                    onClick={() => onConfirmAction(current.incidentId, false)}
                >
                    <span>{t("activeList.reject")}</span>
                </ChamferButton>
                <ChamferButton
                    variant="dark"
                    size="sm"
                    clip="sm"
                    type="button"
                    disabled={submitting}
                    onClick={() => onConfirmAction(current.incidentId, true)}
                >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t("activeList.confirmAction")}</span>
                </ChamferButton>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("modals.confirm.title")}
            maxWidth="540px"
            footer={footer}
        >
            <div className="flex flex-col gap-4">
                <TacticalCallout
                    tone={severity === EMERGENCY_SEVERITY.WARNING ? "warning" : "critical"}
                    icon={SeverityIcon}
                    title={
                        incident.message
                            ? localizeServerText(incident.message, locale, { entityMap })
                            : typeLabel
                    }
                    description={t("modals.confirm.supervisedDesc")}
                    rightSlot={<StatusBadge status={severity} />}
                />

                <dl className="grid grid-cols-2 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden text-xs font-mono">
                    <div className="bg-[var(--color-surface-panel)] px-3 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                            {t("modals.confirm.aircraft")}
                        </dt>
                        <dd className="font-bold text-[var(--color-text-primary)] mt-0.5 truncate">
                            {droneLabel}
                        </dd>
                    </div>
                    <div className="bg-[var(--color-surface-panel)] px-3 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                            {t("modals.confirm.flight")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)] mt-0.5 truncate">
                            {flightLabel || "—"}
                        </dd>
                    </div>
                    <div className="bg-[var(--color-surface-panel)] px-3 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                            {t("detail.emergencyType")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)] mt-0.5 truncate">
                            {typeLabel}
                        </dd>
                    </div>
                    <div className="bg-[var(--color-surface-panel)] px-3 py-2.5">
                        <dt className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                            {t("modals.confirm.protocol")}
                        </dt>
                        <dd className="font-semibold text-[var(--color-text-primary)] mt-0.5 break-words leading-snug">
                            {protocol?.name
                                ? localizeServerText(protocol.name, locale, { entityMap })
                                : t("modals.confirm.standardFailsafe")}
                        </dd>
                    </div>
                </dl>

                <div className="px-3.5 py-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex items-center justify-between gap-3">
                    <div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-text-muted)] block">
                            {t("modals.confirm.proposedAction")}
                        </span>
                        <span className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5 block">
                            {actionDescription}
                        </span>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-mono font-bold rounded bg-slate-900 text-white shrink-0">
                        {localizeResponseAction(proposedAction, locale, true)}
                    </span>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                        <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <Clock
                                className={`w-3.5 h-3.5 ${isUrgent ? "text-red-600" : "text-amber-600"}`}
                                aria-hidden="true"
                            />
                            <span>
                                {protocol?.autoExecuteOnTimeout === false
                                    ? t("modals.confirm.expiresIn")
                                    : t("modals.confirm.autoExecuteIn")}
                            </span>
                        </span>
                        <span
                            className={`font-bold tabular-nums ${
                                isUrgent ? "text-red-600" : "text-amber-700"
                            }`}
                        >
                            {formatDuration(remainingSec)}
                        </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                            className={`h-full transition-[width] duration-500 rounded-full ${
                                isUrgent ? "bg-red-600" : "bg-amber-500"
                            }`}
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
}
