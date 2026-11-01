"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput } from "@/components/ui";
import { useFlightsAll } from "@/hooks";
import { parseApiError } from "@/utils";
import { createSessionBody } from "@/generated";
import type { CreateSimulationSessionPayload } from "@/types";

export interface AddSimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateSimulationSessionPayload) => Promise<void>;
}

export function AddSimulationModal({ isOpen, onClose, onSubmit }: AddSimulationModalProps) {
    const { data: flights = [] } = useFlightsAll();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        formState: { errors },
    } = useForm<CreateSimulationSessionPayload>({
        resolver: zodResolver(createSessionBody) as any,
        defaultValues: {
            flightId: "",
            speed: 15.0,
            timeScale: 1.0,
            startBattery: 100.0,
        },
    });

    useEffect(() => {
        if (isOpen) {
            reset({
                flightId: "",
                speed: 15.0,
                timeScale: 1.0,
                startBattery: 100.0,
            });
        }
    }, [isOpen, reset]);

    const onFormSubmit = async (data: CreateSimulationSessionPayload) => {
        if (!data.flightId || !data.flightId.trim()) {
            setError("flightId", { message: "Please select a flight plan to simulate" });
            return;
        }
        try {
            setLoading(true);
            const payload: CreateSimulationSessionPayload = {
                flightId: data.flightId.trim(),
                speed: Number(data.speed) || 15.0,
                timeScale: Number(data.timeScale) || 1.0,
                startBattery: Number(data.startBattery) ?? 100.0,
            };
            await onSubmit(payload);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to launch simulation");
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
            title="Launch Simulation Session"
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText="Launch Simulation"
            loadingText="Launching..."
        >
            <div className="form-group">
                <label className="form-label" htmlFor="flightId">
                    Flight Plan <span className="text-red-500">*</span>
                </label>
                <Controller
                    name="flightId"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                            value={field.value || ""}
                            onValueChange={(val: string) => field.onChange(val)}
                            options={flights.map((flight) => {
                                const flightLabel = flight.flightNumber || flight.id;
                                const statusLabel = flight.status ? `(${flight.status})` : "";
                                const droneLabel = flight.droneId
                                    ? `• Drone: ${flight.droneId}`
                                    : "";
                                return {
                                    label: `${flightLabel} ${statusLabel} ${droneLabel}`.trim(),
                                    value: flight.id,
                                };
                            })}
                            placeholder="Select a flight plan to simulate"
                        />
                    )}
                />
                {errors.flightId?.message && (
                    <span className="text-xs text-red-500 mt-1 block">
                        {errors.flightId.message}
                    </span>
                )}
            </div>

            <div className="form-row-2">
                <FormInput
                    id="speed"
                    label="Cruising Speed (m/s)"
                    type="number"
                    step="0.5"
                    min="1"
                    placeholder="15.0"
                    error={errors.speed?.message}
                    {...register("speed", { valueAsNumber: true })}
                />

                <FormInput
                    id="timeScale"
                    label="Time-Scale Multiplier (0.1x - 20x)"
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="20"
                    placeholder="1.0"
                    error={errors.timeScale?.message}
                    {...register("timeScale", { valueAsNumber: true })}
                />
            </div>

            <FormInput
                id="startBattery"
                label="Initial Battery (%)"
                type="number"
                step="1"
                min="10"
                max="100"
                placeholder="100"
                error={errors.startBattery?.message}
                {...register("startBattery", { valueAsNumber: true })}
            />
        </Modal>
    );
}

export default AddSimulationModal;
