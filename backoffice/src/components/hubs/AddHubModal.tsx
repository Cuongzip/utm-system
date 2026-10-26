"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Modal, CustomSelect, FormInput, CoordinatesInput } from "@/components/ui";
import { toast } from "sonner";
import { parseApiError } from "@/utils";
import { updateHubBody } from "@/generated";
import type { Hub, CreateHubPayload, UpdateHubPayload, HubStatus } from "@/types";

interface AddHubModalProps {
    isOpen: boolean;
    hubToEdit?: Hub | null;
    onClose: () => void;
    onSubmit: (payload: CreateHubPayload | UpdateHubPayload, id?: string) => Promise<void>;
}

const HUB_STATUS_OPTIONS = updateHubBody.shape.status.unwrap().options;

interface HubFormValues {
    code: string;
    name: string;
    lat: number;
    lng: number;
    airspaceRadius: number;
    altitudeMsl: number;
    timezone: string;
    status: HubStatus;
}

export function AddHubModal({ isOpen, hubToEdit, onClose, onSubmit }: AddHubModalProps) {
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        setValue,
        watch,
        formState: { errors },
    } = useForm<HubFormValues>({
        defaultValues: {
            code: "",
            name: "",
            lat: 0,
            lng: 0,
            airspaceRadius: 5000,
            altitudeMsl: 400,
            timezone: "UTC",
            status: HUB_STATUS_OPTIONS[0],
        },
    });

    const watchedLat = watch("lat");
    const watchedLng = watch("lng");

    useEffect(() => {
        if (isOpen) {
            if (hubToEdit) {
                const matchedStatus = HUB_STATUS_OPTIONS.find(
                    (s) => s.toLowerCase() === hubToEdit.status?.toLowerCase()
                );
                reset({
                    code: hubToEdit.code || "",
                    name: hubToEdit.name || "",
                    lat: hubToEdit.location?.lat ?? 0,
                    lng: hubToEdit.location?.lng ?? 0,
                    airspaceRadius: hubToEdit.airspaceRadius ?? 5000,
                    altitudeMsl: hubToEdit.altitudeMsl ?? 400,
                    timezone: "UTC",
                    status: matchedStatus || HUB_STATUS_OPTIONS[0],
                });
            } else {
                reset({
                    code: "",
                    name: "",
                    lat: 0,
                    lng: 0,
                    airspaceRadius: 5000,
                    altitudeMsl: 400,
                    timezone: "UTC",
                    status: HUB_STATUS_OPTIONS[0],
                });
            }
        }
    }, [isOpen, hubToEdit, reset]);

    const onFormSubmit = async (values: HubFormValues) => {
        try {
            setLoading(true);

            if (hubToEdit) {
                const payload: UpdateHubPayload = {
                    name: values.name.trim() || undefined,
                    airspaceRadius: Number(values.airspaceRadius),
                    altitudeMsl: Number(values.altitudeMsl),
                    status: values.status,
                };
                await onSubmit(payload, hubToEdit.id);
            } else {
                const payload: CreateHubPayload = {
                    code: values.code.trim().toUpperCase(),
                    name: values.name.trim(),
                    location: {
                        lat: Number(values.lat),
                        lng: Number(values.lng),
                    },
                    airspaceRadius: Number(values.airspaceRadius),
                    altitudeMsl: Number(values.altitudeMsl),
                };
                await onSubmit(payload);
            }
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save hub");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    const mappedField = field.replace("location.", "") as keyof HubFormValues;
                    setError(mappedField as any, { message: msg });
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
            title={hubToEdit ? "Edit Hub" : "Add Hub"}
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText={hubToEdit ? "Save Changes" : "Create Hub"}
            loadingText={hubToEdit ? "Saving..." : "Creating..."}
        >
            <FormInput
                id="hubCode"
                label="Code"
                required
                disabled={!!hubToEdit}
                placeholder="e.g. HUB-001"
                error={errors.code?.message}
                {...register("code", { required: !hubToEdit ? "Code is required" : false })}
            />

            <FormInput
                id="hubName"
                label="Name"
                required
                placeholder="Hub name"
                error={errors.name?.message}
                {...register("name", { required: "Name is required" })}
            />

            <CoordinatesInput
                lat={String(watchedLat || "")}
                lng={String(watchedLng || "")}
                onLatChange={(v) => setValue("lat", Number(v) || 0)}
                onLngChange={(v) => setValue("lng", Number(v) || 0)}
                latError={errors.lat?.message}
                lngError={errors.lng?.message}
            />

            <div className="form-row-2">
                <FormInput
                    id="airspaceRadius"
                    label="Radius (m)"
                    required
                    type="number"
                    step="any"
                    placeholder="5000"
                    error={errors.airspaceRadius?.message}
                    {...register("airspaceRadius", { valueAsNumber: true })}
                />

                <FormInput
                    id="altitudeMsl"
                    label="Ceiling / Altitude MSL (m)"
                    type="number"
                    step="any"
                    placeholder="400"
                    error={errors.altitudeMsl?.message}
                    {...register("altitudeMsl", { valueAsNumber: true })}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="timezone"
                    label="Timezone"
                    type="text"
                    placeholder="UTC"
                    error={errors.timezone?.message}
                    {...register("timezone")}
                />

                {hubToEdit && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="status">
                            Status
                        </label>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={HUB_STATUS_OPTIONS.map((opt) => ({
                                        value: opt,
                                        label: opt.toUpperCase(),
                                    }))}
                                    error={Boolean(errors.status)}
                                />
                            )}
                        />
                        {errors.status && (
                            <span className="form-error-msg">{errors.status.message}</span>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default AddHubModal;
