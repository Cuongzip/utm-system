"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch, type Resolver, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Modal, CustomSelect, FormInput, AutoGenInput } from "@/components/ui";
import { useHubsAll, useOrganizationsAll } from "@/hooks";
import { parseApiError } from "@/utils";
import { createDroneBody, updateDroneBody } from "@/generated/drone";
import {
    DRONE_PHYSICS_DEFAULTS,
    DRONE_STATUSES,
    DEFAULT_DRONE_STATUS,
    type Drone,
    type CreateDronePayload,
    type UpdateDronePayload,
    type DroneFormPayload,
} from "@/types";

const optionalNumberValueAs = (value: unknown) => {
    if (value === "" || value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
};

export interface AddDroneModalProps {
    isOpen: boolean;
    droneToEdit?: Drone | null;
    onClose: () => void;
    onSubmit: (payload: CreateDronePayload | UpdateDronePayload, id?: string) => Promise<unknown>;
}

export function AddDroneModal({ isOpen, droneToEdit, onClose, onSubmit }: AddDroneModalProps) {
    const { data: hubs = [] } = useHubsAll();
    const { data: organizations = [] } = useOrganizationsAll(isOpen);
    const [loading, setLoading] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        setError,
        formState: { errors },
    } = useForm<DroneFormPayload>({
        resolver: zodResolver(
            droneToEdit ? updateDroneBody : createDroneBody
        ) as Resolver<DroneFormPayload>,
        defaultValues: {
            registrationNumber: undefined,
            manufacturer: "",
            model: "",
            ownerId: undefined,
            homeHubId: undefined,
            batteryCapacityWh: DRONE_PHYSICS_DEFAULTS.batteryCapacityWh,
            maxPayload: DRONE_PHYSICS_DEFAULTS.maxPayload,
            status: DEFAULT_DRONE_STATUS,
            hoverPowerW: DRONE_PHYSICS_DEFAULTS.hoverPowerW,
            cruisePowerW: DRONE_PHYSICS_DEFAULTS.cruisePowerW,
            cruiseSpeedMs: DRONE_PHYSICS_DEFAULTS.cruiseSpeedMs,
            batteryHealthPct: DRONE_PHYSICS_DEFAULTS.batteryHealthPct,
            windToleranceMs: DRONE_PHYSICS_DEFAULTS.windToleranceMs,
        },
    });

    useEffect(() => {
        if (!isOpen) return;

        reset({
            registrationNumber: droneToEdit?.registrationNumber || droneToEdit?.id || undefined,
            manufacturer: droneToEdit?.manufacturer || "",
            model: droneToEdit?.model || "",
            ownerId: droneToEdit?.ownerId || droneToEdit?.owner?.id || undefined,
            homeHubId: droneToEdit?.homeHubId || droneToEdit?.homeHub?.id || undefined,
            batteryCapacityWh:
                droneToEdit?.batteryCapacityWh ?? DRONE_PHYSICS_DEFAULTS.batteryCapacityWh,
            maxPayload: droneToEdit?.maxPayload ?? DRONE_PHYSICS_DEFAULTS.maxPayload,
            status: droneToEdit?.status ?? DEFAULT_DRONE_STATUS,
            hoverPowerW: droneToEdit?.hoverPowerW ?? DRONE_PHYSICS_DEFAULTS.hoverPowerW,
            cruisePowerW: droneToEdit?.cruisePowerW ?? DRONE_PHYSICS_DEFAULTS.cruisePowerW,
            cruiseSpeedMs: droneToEdit?.cruiseSpeedMs ?? DRONE_PHYSICS_DEFAULTS.cruiseSpeedMs,
            batteryHealthPct:
                droneToEdit?.batteryHealthPct ?? DRONE_PHYSICS_DEFAULTS.batteryHealthPct,
            windToleranceMs: droneToEdit?.windToleranceMs ?? DRONE_PHYSICS_DEFAULTS.windToleranceMs,
        });
    }, [isOpen, droneToEdit, reset]);

    const currentOwnerId = useWatch({ control, name: "ownerId" });
    useEffect(() => {
        if (isOpen && !droneToEdit && !currentOwnerId && organizations.length === 1) {
            setValue("ownerId", organizations[0].id);
        }
    }, [isOpen, droneToEdit, currentOwnerId, organizations, setValue]);

    const rawCruisePower = useWatch({ control, name: "cruisePowerW" });
    const rawCruiseSpeed = useWatch({ control, name: "cruiseSpeedMs" });
    const watchedCruisePower = rawCruisePower ?? DRONE_PHYSICS_DEFAULTS.cruisePowerW;
    const watchedCruiseSpeed = rawCruiseSpeed ?? DRONE_PHYSICS_DEFAULTS.cruiseSpeedMs;

    const hasAdvancedErrors = Boolean(
        errors.hoverPowerW ||
        errors.cruisePowerW ||
        errors.cruiseSpeedMs ||
        errors.batteryHealthPct ||
        errors.windToleranceMs
    );
    const isAdvancedExpanded = showAdvanced || hasAdvancedErrors;

    const handleCloseModal = () => {
        setShowAdvanced(false);
        onClose();
    };

    const onFormSubmit = async (data: DroneFormPayload) => {
        try {
            setLoading(true);
            const commonFields = {
                homeHubId: data.homeHubId || undefined,
                batteryCapacityWh: data.batteryCapacityWh,
                maxPayload: data.maxPayload,
                hoverPowerW: data.hoverPowerW,
                cruisePowerW: data.cruisePowerW,
                cruiseSpeedMs: data.cruiseSpeedMs,
                batteryHealthPct: data.batteryHealthPct,
                windToleranceMs: data.windToleranceMs,
            };

            if (droneToEdit) {
                const payload: UpdateDronePayload = {
                    ...commonFields,
                    status: data.status,
                };
                await onSubmit(payload, droneToEdit.id);
            } else {
                const payload: CreateDronePayload = {
                    ...commonFields,
                    ownerId: data.ownerId || undefined,
                    registrationNumber: data.registrationNumber?.toUpperCase(),
                    manufacturer: data.manufacturer.trim(),
                    model: data.model.trim(),
                };
                await onSubmit(payload);
            }
            handleCloseModal();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to register drone");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    setError(field as Path<DroneFormPayload>, { message: msg });
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCloseModal}
            title={droneToEdit ? "Edit Drone" : "Register Drone"}
            maxWidth="520px"
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
                manualPlaceholder="e.g. VN-UAV-001"
                error={errors.registrationNumber?.message}
                {...register("registrationNumber")}
            />

            <div className="form-row-2">
                <FormInput
                    id="manufacturer"
                    label="Manufacturer"
                    required={!droneToEdit}
                    disabled={Boolean(droneToEdit)}
                    placeholder="e.g. DJI"
                    error={errors.manufacturer?.message}
                    {...register("manufacturer")}
                />

                <FormInput
                    id="model"
                    label="Model"
                    required={!droneToEdit}
                    disabled={Boolean(droneToEdit)}
                    placeholder="e.g. Matrice 350 RTK"
                    error={errors.model?.message}
                    {...register("model")}
                />
            </div>

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="homeHub">
                        Home Hub
                    </label>
                    <Controller
                        name="homeHubId"
                        control={control}
                        render={({ field }) => (
                            <CustomSelect
                                id="homeHub"
                                value={field.value || ""}
                                onValueChange={(val: string) => field.onChange(val || undefined)}
                                options={[
                                    { label: "No Home Hub Assigned", value: "" },
                                    ...hubs.map((hub) => ({
                                        label: `${hub.name} (${hub.code || "HUB"})`,
                                        value: hub.id,
                                    })),
                                ]}
                                placeholder="Select a home hub"
                            />
                        )}
                    />
                </div>

                {droneToEdit ? (
                    <div className="form-group">
                        <label className="form-label" htmlFor="droneStatus">
                            Status
                        </label>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    id="droneStatus"
                                    value={field.value ?? DEFAULT_DRONE_STATUS}
                                    onValueChange={field.onChange}
                                    options={DRONE_STATUSES.map((s) => ({
                                        value: s,
                                        label: s.replace(/_/g, " ").toUpperCase(),
                                    }))}
                                    error={Boolean(errors.status)}
                                />
                            )}
                        />
                        {errors.status && (
                            <span className="form-error-msg">{errors.status.message}</span>
                        )}
                    </div>
                ) : (
                    <div className="form-group">
                        <label className="form-label" htmlFor="ownerId">
                            Organization
                        </label>
                        <Controller
                            name="ownerId"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    id="ownerId"
                                    value={field.value || ""}
                                    onValueChange={(val: string) =>
                                        field.onChange(val || undefined)
                                    }
                                    options={[
                                        { label: "Default Organization", value: "" },
                                        ...organizations.map((org) => ({
                                            label: org.name,
                                            value: org.id,
                                        })),
                                    ]}
                                    placeholder="Select organization (optional)"
                                />
                            )}
                        />
                    </div>
                )}
            </div>

            <div className="form-row-2">
                <FormInput
                    id="batteryCapacityWh"
                    label="Battery Capacity (Wh)"
                    type="number"
                    step="any"
                    min={1}
                    required
                    placeholder="e.g. 400"
                    error={errors.batteryCapacityWh?.message}
                    {...register("batteryCapacityWh", { valueAsNumber: true })}
                />

                <FormInput
                    id="maxPayload"
                    label="Max Payload (kg)"
                    type="number"
                    step="any"
                    min={0}
                    required
                    placeholder="e.g. 2.5"
                    error={errors.maxPayload?.message}
                    {...register("maxPayload", { valueAsNumber: true })}
                />
            </div>

            <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)]">
                <button
                    type="button"
                    onClick={() => setShowAdvanced((prev) => !prev)}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left rounded-md hover:bg-[var(--color-surface-card)]/70 transition-colors cursor-pointer"
                >
                    <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                        Advanced Energy &amp; Performance
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-white border border-[var(--color-border-default)] text-[11px] font-mono text-slate-600">
                            {watchedCruiseSpeed} m/s · {watchedCruisePower}W
                        </span>
                        {isAdvancedExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                    </div>
                </button>

                {isAdvancedExpanded && (
                    <div className="px-3.5 pb-3.5 pt-3 border-t border-[var(--color-border-default)] flex flex-col gap-3.5 bg-[var(--color-surface-subtle)]">
                        <div className="form-row-2">
                            <FormInput
                                id="hoverPowerW"
                                label="Hover Power (W)"
                                type="number"
                                step="any"
                                min={1}
                                placeholder="350"
                                error={errors.hoverPowerW?.message}
                                {...register("hoverPowerW", { setValueAs: optionalNumberValueAs })}
                            />
                            <FormInput
                                id="cruisePowerW"
                                label="Cruise Power (W)"
                                type="number"
                                step="any"
                                min={1}
                                placeholder="280"
                                error={errors.cruisePowerW?.message}
                                {...register("cruisePowerW", { setValueAs: optionalNumberValueAs })}
                            />
                        </div>

                        <div className="form-row-2">
                            <FormInput
                                id="cruiseSpeedMs"
                                label="Cruise Speed (m/s)"
                                type="number"
                                step="any"
                                min={1}
                                placeholder="15"
                                error={errors.cruiseSpeedMs?.message}
                                {...register("cruiseSpeedMs", {
                                    setValueAs: optionalNumberValueAs,
                                })}
                            />
                            <FormInput
                                id="windToleranceMs"
                                label="Wind Tolerance (m/s)"
                                type="number"
                                step="any"
                                min={1}
                                placeholder="12"
                                error={errors.windToleranceMs?.message}
                                {...register("windToleranceMs", {
                                    setValueAs: optionalNumberValueAs,
                                })}
                            />
                        </div>

                        <div className="form-row-2">
                            <FormInput
                                id="batteryHealthPct"
                                label="Battery Health (%)"
                                type="number"
                                step="any"
                                min={1}
                                max={100}
                                placeholder="100"
                                error={errors.batteryHealthPct?.message}
                                {...register("batteryHealthPct", {
                                    setValueAs: optionalNumberValueAs,
                                })}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
