"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui";
import { cn, parseApiError, validateSchema, createFieldErrorCleaner } from "@/utils";
import { registerDeviceBody } from "@/generated";
import type { DeviceRegistrationPayload } from "@/types";

interface RegisterDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: DeviceRegistrationPayload) => Promise<void>;
}

export function RegisterDeviceModal({ isOpen, onClose, onSubmit }: RegisterDeviceModalProps) {
    const [droneId, setDroneId] = useState("");
    const [deviceIdentifier, setDeviceIdentifier] = useState("");
    const [certificateFingerprint, setCertificateFingerprint] = useState("");
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = createFieldErrorCleaner(setFieldErrors);

    useEffect(() => {
        if (isOpen) {
            setDroneId("");
            setDeviceIdentifier("");
            setCertificateFingerprint("");
            setFieldErrors({});
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const validation = validateSchema(registerDeviceBody, {
            droneId: droneId.trim(),
            deviceIdentifier: deviceIdentifier.trim(),
            certificateFingerprint: certificateFingerprint.trim() || undefined,
        });

        if (!validation.success) {
            setFieldErrors(validation.errors);
            return;
        }

        try {
            setLoading(true);
            setFieldErrors({});
            await onSubmit(validation.data as DeviceRegistrationPayload);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to register device");
            setFieldErrors(parsed.fieldErrors);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Register Drone Device"
            onSubmit={handleSubmit}
            loading={loading}
            submitText="Register Device"
            loadingText="Registering..."
        >
            <div className="form-group">
                <label className="form-label" htmlFor="droneId">
                    Drone ID *
                </label>
                <input
                    id="droneId"
                    type="text"
                    value={droneId}
                    onChange={(e) => {
                        setDroneId(e.target.value);
                        clearFieldError("droneId");
                    }}
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    className={cn("form-input", fieldErrors.droneId && "form-input-error")}
                />
                {fieldErrors.droneId && (
                    <span className="form-error-msg">{fieldErrors.droneId}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="deviceIdentifier">
                    Device Identifier *
                </label>
                <input
                    id="deviceIdentifier"
                    type="text"
                    value={deviceIdentifier}
                    onChange={(e) => {
                        setDeviceIdentifier(e.target.value);
                        clearFieldError("deviceIdentifier");
                    }}
                    placeholder="e.g. DEV-UTM-0091"
                    className={cn("form-input", fieldErrors.deviceIdentifier && "form-input-error")}
                />
                {fieldErrors.deviceIdentifier && (
                    <span className="form-error-msg">{fieldErrors.deviceIdentifier}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="certificateFingerprint">
                    Certificate Fingerprint (Optional)
                </label>
                <input
                    id="certificateFingerprint"
                    type="text"
                    value={certificateFingerprint}
                    onChange={(e) => {
                        setCertificateFingerprint(e.target.value);
                        clearFieldError("certificateFingerprint");
                    }}
                    placeholder="e.g. SHA256:4a:5b:6c..."
                    className={cn(
                        "form-input",
                        fieldErrors.certificateFingerprint && "form-input-error"
                    )}
                />
                {fieldErrors.certificateFingerprint && (
                    <span className="form-error-msg">{fieldErrors.certificateFingerprint}</span>
                )}
            </div>
        </Modal>
    );
}

export default RegisterDeviceModal;
