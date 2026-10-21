"use client";

import { Battery, Gauge, MapPin, Plane, Clock } from "lucide-react";
import { Modal, ChamferButton } from "@/components/ui";
import type { Drone } from "@/types";

interface DroneDetailsModalProps {
    drone: Drone | null;
    onClose: () => void;
}

export function DroneDetailsModal({ drone, onClose }: DroneDetailsModalProps) {
    if (!drone) return null;

    return (
        <Modal
            isOpen={!!drone}
            onClose={onClose}
            title={
                <span className="font-mono">
                    {drone.registrationNumber || drone.serialNumber || drone.id}
                </span>
            }
            icon={<Plane className="w-5 h-5 text-[var(--color-border-dark)]" />}
            maxWidth="520px"
            footer={
                <ChamferButton type="button" variant="outline" size="sm" onClick={onClose}>
                    Close
                </ChamferButton>
            }
        >
            <div className="flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-[var(--color-surface-panel)] p-3 rounded-md border border-[var(--color-border-subtle)]">
                    <div>
                        <span className="text-[var(--color-text-muted)] font-mono uppercase text-[10px] block">
                            MANUFACTURER
                        </span>
                        <span className="font-bold text-[var(--color-text-primary)] text-sm">
                            {drone.manufacturer || "N/A"}
                        </span>
                    </div>
                    <div>
                        <span className="text-[var(--color-text-muted)] font-mono uppercase text-[10px] block">
                            MODEL DESIGNATION
                        </span>
                        <span className="font-bold text-[var(--color-text-primary)] text-sm">
                            {drone.model}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)]">
                        <span className="flex items-center gap-2 text-[var(--color-text-muted)] font-medium">
                            <MapPin className="w-4 h-4 text-[var(--color-text-muted)]" />
                            Base Station Hub
                        </span>
                        <span className="font-semibold text-[var(--color-text-primary)]">
                            {drone.homeHub?.name
                                ? `${drone.homeHub.name} (${drone.homeHub.code})`
                                : drone.homeHubName || drone.homeHubId || "Unassigned"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)]">
                        <span className="flex items-center gap-2 text-[var(--color-text-muted)] font-medium">
                            <Battery className="w-4 h-4 text-[var(--color-text-muted)]" />
                            Battery Capacity
                        </span>
                        <span className="font-mono font-bold text-[var(--color-text-primary)]">
                            {drone.batteryCapacityWh ? `${drone.batteryCapacityWh} Wh` : "300 Wh"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)]">
                        <span className="flex items-center gap-2 text-[var(--color-text-muted)] font-medium">
                            <Gauge className="w-4 h-4 text-[var(--color-text-muted)]" />
                            Max Payload
                        </span>
                        <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                            {drone.maxPayload ? `${drone.maxPayload} kg` : "N/A"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-subtle)]">
                        <span className="flex items-center gap-2 text-[var(--color-text-muted)] font-medium">
                            <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
                            Flight Hours Logged
                        </span>
                        <span className="font-mono font-semibold text-[var(--color-text-primary)]">
                            {drone.flightHours !== undefined ? `${drone.flightHours} hrs` : "0 hrs"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <span className="text-[var(--color-text-muted)] font-medium">
                            Operational Status
                        </span>
                        <span className="font-mono font-bold text-xs uppercase px-2 py-0.5 rounded bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]">
                            {drone.status}
                        </span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

export default DroneDetailsModal;
