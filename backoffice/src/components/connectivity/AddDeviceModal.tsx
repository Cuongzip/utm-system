"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, Controller, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput, AutoGenInput, type SelectOption } from "@/components/ui";
import { useDronesAll } from "@/hooks";
import { parseApiError } from "@/utils";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { registerDeviceBody } from "@/generated";
import type { DeviceRegistrationPayload } from "@/types";

function buildDeviceFormValues(): DeviceRegistrationPayload {
    return {
        droneId: "",
        deviceIdentifier: undefined,
        certificateFingerprint: "",
    };
}

interface AddDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: DeviceRegistrationPayload) => Promise<unknown>;
}

export function AddDeviceModal({ isOpen, onClose, onSubmit }: AddDeviceModalProps) {
    const t = useTranslations("connectivity.addModal");
    const tConn = useTranslations("connectivity");
    const locale = useLocale() as AppLocale;
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        formState: { errors },
    } = useForm<DeviceRegistrationPayload>({
        resolver: zodResolver(registerDeviceBody) as unknown as Resolver<DeviceRegistrationPayload>,
        defaultValues: buildDeviceFormValues(),
    });

    useEffect(() => {
        if (isOpen) {
            reset(buildDeviceFormValues());
        }
    }, [isOpen, reset]);

    const droneOptions: SelectOption[] = useMemo(() => {
        return drones.map((drone) => ({
            value: drone.id,
            label: drone.registrationNumber
                ? `${drone.registrationNumber}${drone.model ? ` — ${drone.model}` : ""}`
                : `${drone.model || t("droneFallback")} (${drone.id.substring(0, 8)})`,
            description: drone.status
                ? (translateStatusLabel(drone.status, locale) ?? drone.status.toUpperCase())
                : undefined,
        }));
    }, [drones, locale, t]);

    const onFormSubmit = async (data: DeviceRegistrationPayload) => {
        try {
            setLoading(true);
            const payload: DeviceRegistrationPayload = {
                droneId: data.droneId?.trim() || undefined,
                deviceIdentifier: data.deviceIdentifier,
                certificateFingerprint: data.certificateFingerprint?.trim() || undefined,
            };
            await onSubmit(payload);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, tConn("registerError"));
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    setError(field as Path<DeviceRegistrationPayload>, { message: msg });
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("title")}
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText={tConn("registerDevice")}
            loadingText={t("loadingText")}
        >
            <div className="form-group">
                <label className="form-label" htmlFor="droneId">
                    {t("droneLabel")}
                    <span className="text-red-500">*</span>
                </label>
                <Controller
                    name="droneId"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                            id="droneId"
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            options={droneOptions}
                            placeholder={
                                dronesLoading ? t("loadingDrones") : t("selectDronePlaceholder")
                            }
                            disabled={loading || dronesLoading}
                            error={Boolean(errors.droneId)}
                        />
                    )}
                />
                {errors.droneId && <span className="form-error-msg">{errors.droneId.message}</span>}
            </div>

            <AutoGenInput
                id="deviceIdentifier"
                label={t("deviceIdLabel")}
                manualPlaceholder={t("deviceIdPlaceholder")}
                required
                error={errors.deviceIdentifier?.message}
                {...register("deviceIdentifier")}
            />

            <FormInput
                id="certificateFingerprint"
                label={t("fingerprintLabel")}
                placeholder={t("fingerprintPlaceholder")}
                error={errors.certificateFingerprint?.message}
                {...register("certificateFingerprint")}
            />
        </Modal>
    );
}
