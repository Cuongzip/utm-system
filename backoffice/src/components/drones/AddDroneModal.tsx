"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput, AutoGenInput } from "@/components/ui";
import { useHubsAll } from "@/hooks";
import { parseApiError } from "@/utils";
import { createDroneBody, updateDroneBody } from "@/generated/drone";
import type { Drone, CreateDronePayload, UpdateDronePayload, DroneFormPayload } from "@/types";

export interface AddDroneModalProps {
    isOpen: boolean;
    droneToEdit?: Drone | null;
    onClose: () => void;
    onSubmit: (payload: CreateDronePayload | UpdateDronePayload, id?: string) => Promise<unknown>;
}

export function AddDroneModal({ isOpen, droneToEdit, onClose, onSubmit }: AddDroneModalProps) {
    const { data: hubs = [] } = useHubsAll();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        formState: { errors },
    } = useForm<DroneFormPayload>({
        resolver: zodResolver(droneToEdit ? updateDroneBody : createDroneBody) as any,
        defaultValues: {
            registrationNumber: undefined,
            manufacturer: "",
            model: "",
            homeHubId: undefined,
            batteryCapacityWh: 0,
            maxPayload: 0,
        },
    });

    useEffect(() => {
        if (!isOpen) return;

        reset({
            registrationNumber: droneToEdit?.registrationNumber || droneToEdit?.id || undefined,
            manufacturer: droneToEdit?.manufacturer || "",
            model: droneToEdit?.model || "",
            homeHubId: droneToEdit?.homeHubId || droneToEdit?.homeHub?.id || undefined,
            batteryCapacityWh: droneToEdit?.batteryCapacityWh ?? 0,
            maxPayload: droneToEdit?.maxPayload ?? 0,
        });
    }, [isOpen, droneToEdit, reset]);

    const onFormSubmit = async (data: DroneFormPayload) => {
        try {
            setLoading(true);
            const commonFields = {
                homeHubId: data.homeHubId || undefined,
                batteryCapacityWh: data.batteryCapacityWh,
                maxPayload: data.maxPayload,
            };

            if (droneToEdit) {
                await onSubmit(commonFields, droneToEdit.id);
            } else {
                const trimmedReg = data.registrationNumber?.trim();
                const payload: CreateDronePayload = {
                    ...commonFields,
                    registrationNumber: trimmedReg ? trimmedReg.toUpperCase() : undefined,
                    manufacturer: data.manufacturer.trim(),
                    model: data.model.trim(),
                };
                await onSubmit(payload);
            }
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to register drone");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    setError(field as any, { message: msg });
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
            title={droneToEdit ? "Edit Drone" : "Register Drone"}
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText={droneToEdit ? "Save Changes" : "Register Drone"}
            loadingText="Saving..."
        >
            <AutoGenInput
                id="registrationNumber"
                label="Registration Number"
                showAutoGen={!droneToEdit}
                disabled={Boolean(droneToEdit)}
                manualPlaceholder="e.g. DRN-001"
                error={errors.registrationNumber?.message}
                {...register("registrationNumber")}
            />

            <div className="form-row-2">
                <FormInput
                    id="manufacturer"
                    label="Manufacturer"
                    required
                    placeholder="e.g. DJI"
                    error={errors.manufacturer?.message}
                    {...register("manufacturer")}
                />

                <FormInput
                    id="model"
                    label="Model"
                    required
                    placeholder="e.g. Matrice 300 RTK"
                    error={errors.model?.message}
                    {...register("model")}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="homeHub">
                    Home Hub
                </label>
                <Controller
                    name="homeHubId"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                            value={field.value || ""}
                            onValueChange={(val: string) => field.onChange(val || undefined)}
                            options={[
                                { label: "No Home Hub Assigned", value: "" },
                                ...hubs.map((hub) => ({
                                    label: `${hub.name} (${hub.code || "HUB"})`,
                                    value: hub.id,
                                })),
                            ]}
                            placeholder="Select a home hub (optional)"
                        />
                    )}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="batteryCapacityWh"
                    label="Battery Capacity (Wh)"
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 5000"
                    error={errors.batteryCapacityWh?.message}
                    {...register("batteryCapacityWh", { valueAsNumber: true })}
                />

                <FormInput
                    id="maxPayload"
                    label="Max Payload (kg)"
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 2.5"
                    error={errors.maxPayload?.message}
                    {...register("maxPayload", { valueAsNumber: true })}
                />
            </div>
        </Modal>
    );
}
