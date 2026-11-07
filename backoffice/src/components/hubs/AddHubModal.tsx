"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput, Switch } from "@/components/ui";
import { parseApiError } from "@/utils";
import { createHubBody, updateHubBody } from "@/generated";
import type { Hub, CreateHubPayload, UpdateHubPayload, HubFormPayload } from "@/types";

interface AddHubModalProps {
    isOpen: boolean;
    hubToEdit?: Hub | null;
    onClose: () => void;
    onSubmit: (payload: CreateHubPayload | UpdateHubPayload, id?: string) => Promise<unknown>;
}

const HUB_STATUS_OPTIONS = updateHubBody.shape.status.unwrap().options;

export function AddHubModal({ isOpen, hubToEdit, onClose, onSubmit }: AddHubModalProps) {
    const [loading, setLoading] = useState(false);
    const [autoGen, setAutoGen] = useState(true);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        clearErrors,
        setValue,
        formState: { errors },
    } = useForm<HubFormPayload>({
        resolver: ((values: any, context: any, options: any) => {
            const sanitizedValues = {
                ...values,
                code: !hubToEdit && autoGen ? undefined : values.code,
            };
            const schema = hubToEdit ? updateHubBody : createHubBody;
            return (zodResolver(schema) as any)(sanitizedValues, context, options);
        }) as any,
        defaultValues: {
            code: "",
            name: "",
            location: {
                latitude: 16.0544,
                longitude: 108.2208,
            },
            airspaceRadius: 1500,
            altitudeMsl: 12.5,
            status: HUB_STATUS_OPTIONS[0],
        },
    });

    useEffect(() => {
        if (!isOpen) return;

        const isEdit = Boolean(hubToEdit);
        setAutoGen(!isEdit);

        const matchedStatus = hubToEdit?.status
            ? HUB_STATUS_OPTIONS.find((s) => s.toLowerCase() === hubToEdit.status?.toLowerCase())
            : undefined;

        reset({
            code: hubToEdit?.code || "",
            name: hubToEdit?.name || "",
            location: {
                latitude: hubToEdit?.location?.latitude ?? 16.0544,
                longitude: hubToEdit?.location?.longitude ?? 108.2208,
            },
            airspaceRadius: hubToEdit?.airspaceRadius ?? 1500,
            altitudeMsl: hubToEdit?.altitudeMsl ?? 12.5,
            status: matchedStatus || HUB_STATUS_OPTIONS[0],
        });
    }, [isOpen, hubToEdit, reset]);

    const handleAutoGenChange = (checked: boolean) => {
        setAutoGen(checked);
        setValue("code", "");
        if (checked) {
            clearErrors("code");
        }
    };

    const onFormSubmit = async (values: HubFormPayload) => {
        try {
            setLoading(true);

            if (hubToEdit) {
                const payload: UpdateHubPayload = {
                    name: values.name?.trim() || undefined,
                    location: values.location,
                    airspaceRadius: values.airspaceRadius,
                    altitudeMsl: values.altitudeMsl,
                    status: values.status,
                };
                await onSubmit(payload, hubToEdit.id);
            } else {
                const trimmedCode = values.code?.trim();
                const payload: CreateHubPayload = {
                    code: autoGen || !trimmedCode ? undefined : trimmedCode.toUpperCase(),
                    name: values.name.trim(),
                    location: values.location,
                    airspaceRadius: values.airspaceRadius,
                    altitudeMsl: values.altitudeMsl,
                };
                await onSubmit(payload);
            }
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save hub");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    if (field === "latitude" || field === "location.latitude") {
                        setError("location.latitude" as any, { message: msg });
                    } else if (field === "longitude" || field === "location.longitude") {
                        setError("location.longitude" as any, { message: msg });
                    } else {
                        setError(field as any, { message: msg });
                    }
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
            title={hubToEdit ? "Edit Hub" : "Add Hub"}
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText={hubToEdit ? "Save Changes" : "Create Hub"}
            loadingText={hubToEdit ? "Saving..." : "Creating..."}
        >
            <FormInput
                id="hubCode"
                label="Code"
                labelRight={
                    !hubToEdit && (
                        <Switch
                            label="AUTO-GEN"
                            checked={autoGen}
                            onCheckedChange={handleAutoGenChange}
                        />
                    )
                }
                required={!hubToEdit && !autoGen}
                disabled={!!hubToEdit || autoGen}
                placeholder={autoGen ? "Auto-generated by system" : "e.g. HUB-SGN-01"}
                error={errors.code?.message}
                {...register("code")}
            />

            <FormInput
                id="hubName"
                label="Name"
                required
                placeholder="Hub name"
                error={errors.name?.message}
                {...register("name")}
            />

            <div className="form-row-2">
                <FormInput
                    id="hubLatitude"
                    label="Latitude"
                    required
                    type="number"
                    step="any"
                    placeholder="e.g. 16.0544"
                    error={errors.location?.latitude?.message}
                    {...register("location.latitude", { valueAsNumber: true })}
                />
                <FormInput
                    id="hubLongitude"
                    label="Longitude"
                    required
                    type="number"
                    step="any"
                    placeholder="e.g. 108.2208"
                    error={errors.location?.longitude?.message}
                    {...register("location.longitude", { valueAsNumber: true })}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="airspaceRadius"
                    label="Airspace Radius (m)"
                    required
                    type="number"
                    step="any"
                    placeholder="1500"
                    error={errors.airspaceRadius?.message}
                    {...register("airspaceRadius", { valueAsNumber: true })}
                />

                <FormInput
                    id="altitudeMsl"
                    label="Altitude MSL (m)"
                    required
                    type="number"
                    step="any"
                    placeholder="12.5"
                    error={errors.altitudeMsl?.message}
                    {...register("altitudeMsl", { valueAsNumber: true })}
                />
            </div>

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
        </Modal>
    );
}
