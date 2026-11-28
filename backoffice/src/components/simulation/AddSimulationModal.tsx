"use client";

import { useEffect, useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, Controller, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput, type SelectOption } from "@/components/ui";
import { useFlightsAll, useDronesAll } from "@/hooks";
import { parseApiError } from "@/utils";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { createSessionBody } from "@/generated";
import {
    DRONE_STATUS,
    FLIGHT_STATUS,
    SIMULATION_STATUS,
    type CreateSimulationSessionPayload,
    type SimulationSession,
} from "@/types";

interface AddSimulationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (payload: CreateSimulationSessionPayload) => Promise<void>;
    activeSessions?: SimulationSession[];
}

const DEFAULT_FORM_VALUES: CreateSimulationSessionPayload = {
    flightId: "",
    speed: 15.0,
    timeScale: 1.0,
    startBattery: 100.0,
};

const SIMULATABLE_FLIGHT_STATUSES = new Set<string>([
    FLIGHT_STATUS.AUTHORIZED,
    FLIGHT_STATUS.ACTIVE,
]);
const EMPTY_SESSIONS: SimulationSession[] = [];

export function AddSimulationModal({
    isOpen,
    onClose,
    onSubmit,
    activeSessions = EMPTY_SESSIONS,
}: AddSimulationModalProps) {
    const t = useTranslations("simulation.launchModal");
    const tSim = useTranslations("simulation");
    const locale = useLocale() as AppLocale;
    const { data: flights = [], isLoading: flightsLoading } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();
    const [loading, setLoading] = useState(false);

    const droneMap = useMemo(
        () => new Map(drones.filter((d) => d.id).map((d) => [d.id, d])),
        [drones]
    );

    const busyFlightIds = useMemo(
        () =>
            new Set(
                activeSessions
                    .filter(
                        (s) =>
                            s.status === SIMULATION_STATUS.RUNNING ||
                            s.status === SIMULATION_STATUS.PAUSED
                    )
                    .map((s) => s.flightId)
                    .filter((id): id is string => Boolean(id))
            ),
        [activeSessions]
    );

    const busyDroneIds = useMemo(
        () =>
            new Set(
                activeSessions
                    .filter(
                        (s) =>
                            s.status === SIMULATION_STATUS.RUNNING ||
                            s.status === SIMULATION_STATUS.PAUSED
                    )
                    .map((s) => s.droneId)
                    .filter((id): id is string => Boolean(id))
            ),
        [activeSessions]
    );

    const flightOptions: SelectOption[] = useMemo(
        () =>
            flights
                .filter((flight) => {
                    const normalizedStatus = (flight.status || "").toLowerCase();
                    if (!SIMULATABLE_FLIGHT_STATUSES.has(normalizedStatus)) {
                        return false;
                    }
                    if (busyFlightIds.has(flight.id)) {
                        return false;
                    }
                    if (flight.droneId && busyDroneIds.has(flight.droneId)) {
                        return false;
                    }
                    return true;
                })
                .map((flight) => {
                    const flightLabel =
                        flight.flightNumber || `FLT-${flight.id.slice(0, 8).toUpperCase()}`;
                    const statusLabel = flight.status
                        ? `(${translateStatusLabel(flight.status, locale) ?? flight.status})`
                        : "";
                    const drone = flight.droneId ? droneMap.get(flight.droneId) : undefined;
                    const droneReg = flight.droneId
                        ? drone?.registrationNumber ||
                          drone?.model ||
                          `DRN-${flight.droneId.slice(0, 8).toUpperCase()}`
                        : null;
                    const droneStateHint =
                        flight.status?.toLowerCase() === FLIGHT_STATUS.AUTHORIZED &&
                        drone?.status &&
                        ![DRONE_STATUS.AVAILABLE, "idle"].includes(drone.status.toLowerCase())
                            ? ` [${translateStatusLabel(drone.status, locale) ?? drone.status}]`
                            : "";
                    const droneLabel = droneReg ? `· ${droneReg}${droneStateHint}` : "";
                    return {
                        label: `${flightLabel} ${statusLabel} ${droneLabel}`.trim(),
                        value: flight.id,
                    };
                }),
        [flights, droneMap, busyFlightIds, busyDroneIds, locale]
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
            const parsed = parseApiError(err, tSim("launchModalError"));
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
            title={t("title")}
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText={tSim("launchBtn")}
            loadingText={t("loadingText")}
        >
            <div className="form-group">
                <label className="form-label" htmlFor="flightId">
                    {t("flightPlanLabel")} <span className="text-red-500">*</span>
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
                                    ? t("loadingFlights")
                                    : flightOptions.length === 0
                                      ? t("noFlightsPlaceholder")
                                      : t("selectFlightPlaceholder")
                            }
                            disabled={loading || flightsLoading || flightOptions.length === 0}
                            error={Boolean(errors.flightId)}
                        />
                    )}
                />
                {!flightsLoading && flightOptions.length === 0 && (
                    <span className="text-xs text-slate-500 mt-1 block">{t("noFlightsHint")}</span>
                )}
                {errors.flightId?.message && (
                    <span className="form-error-msg">{errors.flightId.message}</span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormInput
                    id="speed"
                    label={t("speedMs")}
                    type="number"
                    step="0.5"
                    min="1"
                    placeholder="15.0"
                    error={errors.speed?.message}
                    {...register("speed", { valueAsNumber: true })}
                />

                <FormInput
                    id="timeScale"
                    label={t("timeScaleX")}
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
                    label={t("initialBatteryPct")}
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
