"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm, Controller, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput, type SelectOption } from "@/components/ui";
import { useFlightsAll, useDronesAll } from "@/hooks";
import { parseApiError } from "@/utils";
import { createSessionBody } from "@/generated";
import type { CreateSimulationSessionPayload } from "@/types";

export interface AddSimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateSimulationSessionPayload) => Promise<void>;
}

const DEFAULT_FORM_VALUES: CreateSimulationSessionPayload = {
    flightId: "",
    speed: 15.0,
    timeScale: 1.0,
    startBattery: 100.0,
};

export function AddSimulationModal({ isOpen, onClose, onSubmit }: AddSimulationModalProps) {
    const { data: flights = [], isLoading: flightsLoading } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();
    const [loading, setLoading] = useState(false);

    const droneMap = useMemo(
        () =>
            new Map(
                drones
                    .filter((d) => d.id)
                    .map((d) => [d.id, d.registrationNumber || d.model || d.id])
            ),
        [drones]
    );

    const flightOptions: SelectOption[] = useMemo(
        () =>
            flights.map((flight) => {
                const flightLabel =
                    flight.flightNumber || `FLT-${flight.id.slice(0, 8).toUpperCase()}`;
                const statusLabel = flight.status ? `(${flight.status})` : "";
                const droneReg = flight.droneId
                    ? droneMap.get(flight.droneId) ||
                      `DRN-${flight.droneId.slice(0, 8).toUpperCase()}`
                    : null;
                const droneLabel = droneReg ? `· ${droneReg}` : "";
                return {
                    label: `${flightLabel} ${statusLabel} ${droneLabel}`.trim(),
                    value: flight.id,
                };
            }),
        [flights, droneMap]
    );

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        formState: { errors },
    } = useForm<CreateSimulationSessionPayload>({
        resolver: zodResolver(
            createSessionBody
        ) as unknown as Resolver<CreateSimulationSessionPayload>,
        defaultValues: DEFAULT_FORM_VALUES,
    });

    useEffect(() => {
        if (isOpen) {
            reset(DEFAULT_FORM_VALUES);
        }
    }, [isOpen, reset]);

    const onFormSubmit = async (data: CreateSimulationSessionPayload) => {
        try {
            setLoading(true);
            const payload: CreateSimulationSessionPayload = {
                flightId: data.flightId,
                speed: data.speed ?? 15.0,
                timeScale: data.timeScale ?? 1.0,
                startBattery: data.startBattery ?? 100.0,
            };
            await onSubmit(payload);
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to launch simulation");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    setError(field as Path<CreateSimulationSessionPayload>, { message: msg });
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
                            id="flightId"
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            options={flightOptions}
                            placeholder={
                                flightsLoading
                                    ? "Loading flight plans..."
                                    : "Select a flight plan to simulate..."
                            }
                            disabled={loading || flightsLoading}
                            error={Boolean(errors.flightId)}
                        />
                    )}
                />
                {errors.flightId?.message && (
                    <span className="form-error-msg">{errors.flightId.message}</span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormInput
                    id="speed"
                    label="Speed (m/s)"
                    type="number"
                    step="0.5"
                    min="1"
                    placeholder="15.0"
                    error={errors.speed?.message}
                    {...register("speed", { valueAsNumber: true })}
                />

                <FormInput
                    id="timeScale"
                    label="Time Scale (x)"
                    type="number"
                    step="0.5"
                    min="0.1"
                    max="20"
                    placeholder="1.0"
                    error={errors.timeScale?.message}
                    {...register("timeScale", { valueAsNumber: true })}
                />

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
            </div>
        </Modal>
    );
}
