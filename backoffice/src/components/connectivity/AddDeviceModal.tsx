"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Modal, FormInput } from "@/components/ui";
import { parseApiError } from "@/utils";
import { registerDeviceBody } from "@/generated";
import type { DeviceRegistrationPayload } from "@/types";

export interface AddDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: DeviceRegistrationPayload) => Promise<void>;
}

export type RegisterDeviceModalProps = AddDeviceModalProps;

export function AddDeviceModal({ isOpen, onClose, onSubmit }: AddDeviceModalProps) {
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<DeviceRegistrationPayload>({
        resolver: zodResolver(registerDeviceBody) as any,
        defaultValues: {
            droneId: "",
            deviceIdentifier: "",
            certificateFingerprint: "",
        },
    });

    useEffect(() => {
        if (isOpen) {
            reset({
                droneId: "",
                deviceIdentifier: "",
                certificateFingerprint: "",
            });
        }
    }, [isOpen, reset]);

    const onFormSubmit = async (data: DeviceRegistrationPayload) => {
        try {
            setLoading(true);
            const payload: DeviceRegistrationPayload = {
                droneId: data.droneId.trim(),
                deviceIdentifier: data.deviceIdentifier.trim(),
                certificateFingerprint: data.certificateFingerprint?.trim() || undefined,
            };
            await onSubmit(payload);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to register device");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    setError(field as any, { message: msg });
                });
            } else {
                toast.error(parsed.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Register Drone Device"
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText="Register Device"
            loadingText="Registering..."
        >
            <FormInput
                id="droneId"
                label="Drone ID"
                required
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                error={errors.droneId?.message}
                {...register("droneId")}
            />

            <FormInput
                id="deviceIdentifier"
                label="Device Identifier"
                required
                placeholder="e.g. DEV-UTM-0091"
                error={errors.deviceIdentifier?.message}
                {...register("deviceIdentifier")}
            />

            <FormInput
                id="certificateFingerprint"
                label="Certificate Fingerprint (Optional)"
                placeholder="e.g. SHA256:4a:5b:6c..."
                error={errors.certificateFingerprint?.message}
                {...register("certificateFingerprint")}
            />
        </Modal>
    );
}

export const RegisterDeviceModal = AddDeviceModal;
export default AddDeviceModal;
