"use client";

import { useMemo } from "react";
import { Modal, FormInput, ChamferButton, StatusBadge } from "@/components/ui";
import { formatDateTime, formatTime } from "@/utils";
import { INCIDENT_STATUS, DEFAULT_INCIDENT_STATUS, type EmergencyIncidentVm } from "@/types";
import { useDronesAll, useFlightsAll } from "@/hooks/useQueries";

export interface IncidentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    incident?: EmergencyIncidentVm | null;
    onConfirmAction: (id: string, approved: boolean) => void;
}

export function IncidentDetailsModal({
    isOpen,
    onClose,
    incident,
    onConfirmAction,
}: IncidentDetailsModalProps) {
    const { data: drones = [] } = useDronesAll();
    const { data: flights = [] } = useFlightsAll();

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

    if (!isOpen || !incident) return null;

    const isAwaiting = incident.status === INCIDENT_STATUS.PENDING_CONFIRMATION;
    const isResolved = incident.status === INCIDENT_STATUS.RESOLVED;

    const selectedFlight = incident.flightId ? flightMap.get(incident.flightId) : undefined;
    const flightLabel =
        selectedFlight?.flightNumber ||
        (incident.flightId && incident.flightId.length > 12
            ? `FLT-${incident.flightId.slice(0, 8).toUpperCase()}`
            : incident.flightId);
    const effectiveDroneId = incident.droneId || selectedFlight?.droneId;
    const droneLabel = effectiveDroneId
        ? droneMap.get(effectiveDroneId) ||
          (effectiveDroneId.length > 12
              ? `DRN-${effectiveDroneId.slice(0, 8).toUpperCase()}`
              : effectiveDroneId)
        : "Unknown Drone";

    const footer = isAwaiting ? (
        <>
            <ChamferButton variant="outline" size="sm" clip="xs" type="button" onClick={onClose}>
                Close
            </ChamferButton>
            <ChamferButton
                variant="outline"
                size="sm"
                clip="xs"
                type="button"
                onClick={() => {
                    onConfirmAction(incident.id, false);
                    onClose();
                }}
            >
                Reject
            </ChamferButton>
            <ChamferButton
                size="sm"
                variant="dark"
                clip="sm"
                onClick={() => {
                    onConfirmAction(incident.id, true);
                    onClose();
                }}
            >
                Confirm Action
            </ChamferButton>
        </>
    ) : (
        <ChamferButton variant="outline" size="sm" clip="xs" type="button" onClick={onClose}>
            Close
        </ChamferButton>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Incident Details"
            maxWidth="520px"
            footer={footer}
        >
            <div className="flex flex-col gap-3.5">
                <FormInput
                    id="emergencyEvent"
                    label="Emergency Event"
                    readOnly
                    value={incident.message || incident.emergencyType}
                    labelRight={
                        <StatusBadge
                            status={incident.status ?? DEFAULT_INCIDENT_STATUS}
                            label={isAwaiting ? "AWAITING CONFIRMATION" : undefined}
                            dotShape="circle"
                        />
                    }
                />

                <div className="form-row-2">
                    <FormInput
                        id="droneRegistration"
                        label="Drone Registration"
                        readOnly
                        value={droneLabel}
                    />
                    <FormInput
                        id="flightNumber"
                        label="Flight Number"
                        readOnly
                        value={flightLabel || "—"}
                    />
                </div>

                <div className="form-row-2">
                    <FormInput
                        id="severity"
                        label="Severity"
                        readOnly
                        value={incident.severity ? incident.severity.toUpperCase() : "CRITICAL"}
                    />
                    <FormInput
                        id="actionRequired"
                        label="Action Required"
                        readOnly
                        value={incident.responseAction || "Operator Inspection"}
                    />
                </div>

                <div className="form-row-2">
                    <FormInput
                        id="detectedAt"
                        label="Detected At"
                        readOnly
                        value={formatDateTime(incident.detectedAt)}
                    />
                    <FormInput
                        id="status"
                        label="Current Status"
                        readOnly
                        value={
                            isAwaiting
                                ? "Pending Confirmation"
                                : incident.status
                                  ? incident.status.replace(/_/g, " ").toUpperCase()
                                  : "Active"
                        }
                    />
                </div>

                {incident.timeline && incident.timeline.length > 0 && (
                    <div className="form-group">
                        <label className="form-label">Incident Timeline</label>
                        <div className="p-3 bg-[var(--color-surface-panel)] border border-[var(--color-border-strong)] rounded-md flex flex-col gap-2 max-h-36 overflow-y-auto">
                            {incident.timeline.map((evt, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center text-xs border-b border-[var(--color-border-subtle)] last:border-0 pb-1.5 last:pb-0"
                                >
                                    <span className="text-[var(--color-text-primary)] font-medium">
                                        {evt.event}
                                    </span>
                                    <span className="text-[var(--color-text-muted)] text-[11px] shrink-0 ml-2 font-mono">
                                        {formatTime(evt.timestamp)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
