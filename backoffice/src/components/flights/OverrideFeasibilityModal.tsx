"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Modal, FormInput } from "@/components/ui";
import { validateSchema } from "@/utils";
import { overrideFeasibilityBody } from "@/generated/flight";
import type { OverrideFeasibilityPayload } from "@/types";

export interface OverrideFeasibilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    flightId: string;
    flightNumber?: string;
    onConfirm: (payload: OverrideFeasibilityPayload) => Promise<void>;
    loading?: boolean;
}

export function OverrideFeasibilityModal({
    isOpen,
    onClose,
    flightId: _flightId,
    flightNumber,
    onConfirm,
    loading = false,
}: OverrideFeasibilityModalProps) {
    const [approvedBy, setApprovedBy] = useState("");
    const [reason, setReason] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFieldErrors({});

        const payload: OverrideFeasibilityPayload = {
            approvedBy: approvedBy.trim(),
            reason: reason.trim(),
        };

        const validation = validateSchema(overrideFeasibilityBody, payload);
        if (!validation.success) {
            setFieldErrors(validation.errors);
            return;
        }

        await onConfirm(payload);
        setApprovedBy("");
        setReason("");
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="ATC FEASIBILITY OVERRIDE"
            icon={<ShieldAlert className="w-5 h-5 text-amber-500" />}
            onSubmit={handleSubmit}
            loading={loading}
            submitText="Authorize Override"
            submitVariant="dark"
        >
            <div className="space-y-4 text-xs">
                <p className="text-[var(--color-text-secondary)] leading-relaxed">
                    Override pre-flight feasibility verdict for flight{" "}
                    <strong className="text-[var(--color-text-primary)] font-mono">
                        {flightNumber || "operation"}
                    </strong>
                    . This will grant ATC operational clearance and promote the authorization
                    status.
                </p>

                <FormInput
                    id="approvedBy"
                    label="Approved By (ATC Officer / Supervisor)"
                    required
                    value={approvedBy}
                    onChange={(e) => {
                        setApprovedBy(e.target.value);
                        if (fieldErrors.approvedBy) {
                            setFieldErrors((prev) => {
                                const next = { ...prev };
                                delete next.approvedBy;
                                return next;
                            });
                        }
                    }}
                    placeholder="e.g. ATC-HAN-SUPV-01"
                    error={fieldErrors.approvedBy}
                />

                <div className="form-group">
                    <label className="form-label" htmlFor="overrideReason">
                        Operational Justification / Mitigation Reason{" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="overrideReason"
                        rows={3}
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (fieldErrors.reason) {
                                setFieldErrors((prev) => {
                                    const next = { ...prev };
                                    delete next.reason;
                                    return next;
                                });
                            }
                        }}
                        placeholder="State mitigation protocol, favorable headwind observation, or emergency priority..."
                        className="form-input resize-none"
                    />
                    {fieldErrors.reason && (
                        <span className="form-error-msg">{fieldErrors.reason}</span>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default OverrideFeasibilityModal;
