"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, DateTimePicker, FormInput } from "@/components/ui";
import { parseApiError } from "@/utils";
import { createFlightBody } from "@/generated";
import type { Flight, Drone, Hub, CreateFlightPayload } from "@/types";

export interface AddFlightModalProps {
    isOpen: boolean;
    drones?: Drone[];
    hubs?: Hub[];
    onClose: () => void;
    onSubmit: (payload: Partial<Flight>) => Promise<void>;
}

export function AddFlightModal({
    isOpen,
    drones = [],
    hubs = [],
    onClose,
    onSubmit,
}: AddFlightModalProps) {
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        formState: { errors },
    } = useForm<CreateFlightPayload>({
        resolver: zodResolver(createFlightBody) as any,
        defaultValues: {
            flightNumber: "",
            droneId: "",
            departureHubId: "",
            arrivalHubId: "",
            scheduledDeparture: "",
            scheduledArrival: "",
            cruisingAltitudeM: 120,
            notes: "",
        },
    });

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const depTime = new Date(now.getTime() + 30 * 60 * 1000);
            const arrTime = new Date(now.getTime() + 90 * 60 * 1000);

            reset({
                flightNumber: `DRP-${Math.floor(1000 + Math.random() * 9000)}`,
                droneId: drones[0]?.id || "",
                departureHubId: hubs[0]?.id || "",
                arrivalHubId: hubs[1]?.id || hubs[0]?.id || "",
                scheduledDeparture: depTime.toISOString(),
                scheduledArrival: arrTime.toISOString(),
                cruisingAltitudeM: 120,
                notes: "",
            });
        }
    }, [isOpen, drones, hubs, reset]);

    const onFormSubmit = async (data: CreateFlightPayload) => {
        if (data.departureHubId === data.arrivalHubId && hubs.length > 1) {
            setError("arrivalHubId", {
                message: "Departure and arrival vertiports must be different",
            });
            return;
        }

        const dep = hubs.find((h) => h.id === data.departureHubId);
        const arr = hubs.find((h) => h.id === data.arrivalHubId);
        const alt = Number(data.cruisingAltitudeM) || 120;

        let plannedRoute: any = undefined;
        if (dep?.location && arr?.location) {
            plannedRoute = {
                type: "LineString",
                coordinates: [
                    [dep.location.lng, dep.location.lat, alt],
                    [arr.location.lng, arr.location.lat, alt],
                ],
            };
        }

        const payload: CreateFlightPayload = {
            ...data,
            flightNumber: data.flightNumber.trim(),
            cruisingAltitudeM: alt,
            notes: data.notes?.trim() || undefined,
            plannedRoute,
        };

        try {
            setLoading(true);
            await onSubmit(payload);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to create flight plan");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    setError(field as any, { message: msg });
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const droneOptions = drones.map((d) => ({
        value: d.id,
        label: `${d.registrationNumber || d.model || "Drone"} (${d.status || "AVAILABLE"})`,
    }));

    const hubOptions = hubs.map((h) => ({
        value: h.id,
        label: `${h.code} - ${h.name}`,
    }));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create Flight Operation"
            maxWidth="560px"
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText="Register Flight Plan"
            loadingText="Registering..."
        >
            <div className="flex flex-col gap-3">
                <FormInput
                    id="flightNumber"
                    label="Flight Number / Callsign (Optional)"
                    placeholder="Auto-generated (e.g. DRP-2026X)"
                    className="font-mono"
                    error={errors.flightNumber?.message}
                    {...register("flightNumber")}
                />

                <div className="form-group">
                    <label className="form-label" htmlFor="droneId">
                        Assigned Drone <span className="text-red-500 ml-1">*</span>
                    </label>
                    {droneOptions.length > 0 ? (
                        <Controller
                            name="droneId"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={droneOptions}
                                    error={Boolean(errors.droneId)}
                                />
                            )}
                        />
                    ) : (
                        <div className="text-xs text-amber-600 font-medium p-2 bg-amber-50 border border-amber-200 rounded">
                            No registered drones available. Please register a drone first.
                        </div>
                    )}
                    {errors.droneId?.message && (
                        <span className="form-error-msg">{errors.droneId.message}</span>
                    )}
                </div>

                <div className="form-row-2">
                    <div className="form-group">
                        <label className="form-label" htmlFor="departureHubId">
                            Departure Vertiport <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Controller
                            name="departureHubId"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={hubOptions}
                                    error={Boolean(errors.departureHubId)}
                                />
                            )}
                        />
                        {errors.departureHubId?.message && (
                            <span className="form-error-msg">{errors.departureHubId.message}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="arrivalHubId">
                            Arrival Vertiport <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Controller
                            name="arrivalHubId"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    value={field.value}
                                    onValueChange={field.onChange}
                                    options={hubOptions}
                                    error={Boolean(errors.arrivalHubId)}
                                />
                            )}
                        />
                        {errors.arrivalHubId?.message && (
                            <span className="form-error-msg">{errors.arrivalHubId.message}</span>
                        )}
                    </div>
                </div>

                <div className="form-row-2">
                    <div className="form-group">
                        <label className="form-label" htmlFor="scheduledDeparture">
                            Scheduled Departure <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Controller
                            name="scheduledDeparture"
                            control={control}
                            render={({ field }) => (
                                <DateTimePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select departure"
                                    error={Boolean(errors.scheduledDeparture)}
                                />
                            )}
                        />
                        {errors.scheduledDeparture?.message && (
                            <span className="form-error-msg">
                                {errors.scheduledDeparture.message}
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="scheduledArrival">
                            Scheduled Arrival <span className="text-red-500 ml-1">*</span>
                        </label>
                        <Controller
                            name="scheduledArrival"
                            control={control}
                            render={({ field }) => (
                                <DateTimePicker
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="Select arrival"
                                    error={Boolean(errors.scheduledArrival)}
                                />
                            )}
                        />
                        {errors.scheduledArrival?.message && (
                            <span className="form-error-msg">
                                {errors.scheduledArrival.message}
                            </span>
                        )}
                    </div>
                </div>

                <FormInput
                    id="cruisingAltitudeM"
                    label="Cruising Altitude (Meters AGL)"
                    type="number"
                    min="20"
                    max="500"
                    required
                    className="font-mono"
                    error={errors.cruisingAltitudeM?.message}
                    {...register("cruisingAltitudeM", { valueAsNumber: true })}
                />

                <FormInput
                    id="notes"
                    label="Notes & Remarks (Optional)"
                    placeholder="Corridor routing or weather notes"
                    error={errors.notes?.message}
                    {...register("notes")}
                />
            </div>
        </Modal>
    );
}

export default AddFlightModal;
