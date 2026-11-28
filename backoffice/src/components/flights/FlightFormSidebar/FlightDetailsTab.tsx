"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ChamferButton,
    CustomSelect,
    FormInput,
    AutoGenInput,
    StatusBadge,
    type SelectOption,
} from "@/components/ui";
import {
    QUERY_KEYS,
    useCurrentUser,
    useFlightConformance,
    useFlightFeasibility,
    useFlightsAll,
} from "@/hooks";
import { flightService } from "@/services/flightService";
import { cn } from "@/lib";
import { FlightFeasibilityCard } from "../FlightFeasibilityCard";
import {
    CONFORMANCE_STATUS,
    FEASIBILITY_VERDICT,
    type Drone,
    type FeasibilityVerdict,
    type FlightFormPayload,
} from "@/types";

interface FlightDetailsTabProps {
    flightId?: string;
    formData: FlightFormPayload;
    onFormChange: <K extends keyof FlightFormPayload>(
        field: K,
        value: FlightFormPayload[K]
    ) => void;
    mode: "create" | "edit";
    drones: Drone[];
    droneOptions: SelectOption[];
    hubOptions: SelectOption[];
    totalDistanceM: number;
    feasibilityVerdict: FeasibilityVerdict;
    isFeasibilityWarning: boolean;
    isReadOnly: boolean;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

export function FlightDetailsTab({
    flightId,
    formData,
    onFormChange,
    mode,
    drones = [],
    droneOptions,
    hubOptions,
    totalDistanceM,
    feasibilityVerdict,
    isFeasibilityWarning = false,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: FlightDetailsTabProps) {
    const t = useTranslations("flights");
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    const { data: allFlights = [] } = useFlightsAll();
    const selectedDrone = drones.find((d) => d.id === formData.droneId) || null;

    const myPilotId = currentUser?.username || "";
    const pilotSuggestions = useMemo(() => {
        const ids = new Set<string>();
        if (myPilotId) ids.add(myPilotId);
        for (const flight of allFlights) {
            const pid = flight.pilotId?.trim();
            if (pid) ids.add(pid);
        }
        return Array.from(ids).sort((a, b) => a.localeCompare(b));
    }, [allFlights, myPilotId]);
    const { data: conformance } = useFlightConformance(
        flightId,
        mode === "edit" && Boolean(flightId)
    );
    const { data: liveFeasibility } = useFlightFeasibility(
        flightId,
        mode === "edit" && Boolean(flightId) && totalDistanceM > 0
    );

    const rawLiveVerdict = liveFeasibility?.verdict;
    const effectiveVerdict: FeasibilityVerdict =
        rawLiveVerdict === FEASIBILITY_VERDICT.GO ||
        rawLiveVerdict === FEASIBILITY_VERDICT.MARGINAL ||
        rawLiveVerdict === FEASIBILITY_VERDICT.NO_GO
            ? rawLiveVerdict
            : feasibilityVerdict;
    const effectiveIsWarning =
        isFeasibilityWarning ||
        (totalDistanceM > 0 &&
            (effectiveVerdict === FEASIBILITY_VERDICT.MARGINAL ||
                effectiveVerdict === FEASIBILITY_VERDICT.NO_GO));

    const overrideMutation = useMutation({
        mutationFn: (reason: string) =>
            flightService.overrideFeasibility(flightId!, {
                reason,
                approvedBy: currentUser?.username || currentUser?.email || "atc-operator",
            }),
        onSuccess: () => {
            toast.success(t("toasts.overrideAuthorized"));
            if (flightId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flightId) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightFeasibility(flightId) });
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        },
        meta: { defaultErrorMessage: t("toasts.overrideFailed") },
    });

    const overrideReasonText = (formData.feasibilityOverride || "").trim();
    const canSubmitLiveOverride = Boolean(
        mode === "edit" && flightId && !isReadOnly && overrideReasonText.length >= 10
    );

    const showLiveConformance = Boolean(
        conformance?.status && conformance.status !== CONFORMANCE_STATUS.UNKNOWN
    );
    const lateralErr = conformance?.crossTrackErrorM;
    const lateralLimit = conformance?.corridorRadiusM ?? 15;
    const verticalErr = conformance?.verticalErrorM;
    const verticalLimit = conformance?.altitudeBufferM ?? 10;

    return (
        <div className="space-y-4">
            <AutoGenInput
                id="flightNumber"
                label={t("details.flightNumber")}
                showAutoGen={mode !== "edit"}
                disabled={mode === "edit" || isReadOnly}
                required={mode !== "edit"}
                manualPlaceholder={t("details.flightNumberPlaceholder")}
                value={formData.flightNumber ?? ""}
                onChange={(e) => {
                    onFormChange("flightNumber", e.target.value);
                    onClearFieldError("flightNumber");
                }}
                error={fieldErrors.flightNumber}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="droneId">
                    {t("details.assignedDrone")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.droneId}
                    disabled={isReadOnly}
                    onValueChange={(val) => onFormChange("droneId", val)}
                    options={droneOptions}
                    placeholder={t("details.selectDronePlaceholder")}
                    className={cn(fieldErrors.droneId && "form-input-error")}
                />
                {fieldErrors.droneId && (
                    <span className="text-xs text-red-500 mt-1 block font-mono">
                        {fieldErrors.droneId}
                    </span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="departureHubId">
                    {t("details.departureHub")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.departureHubId}
                    disabled={isReadOnly}
                    onValueChange={(val) => onFormChange("departureHubId", val)}
                    options={hubOptions}
                    placeholder={t("details.selectDeparturePlaceholder")}
                    className={cn(fieldErrors.departureHubId && "form-input-error")}
                />
                {fieldErrors.departureHubId && (
                    <span className="text-xs text-red-500 mt-1 block font-mono">
                        {fieldErrors.departureHubId}
                    </span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="arrivalHubId">
                    {t("details.arrivalHub")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.arrivalHubId}
                    disabled={isReadOnly}
                    onValueChange={(val) => onFormChange("arrivalHubId", val)}
                    options={hubOptions}
                    placeholder={t("details.selectArrivalPlaceholder")}
                    className={cn(fieldErrors.arrivalHubId && "form-input-error")}
                />
                {fieldErrors.arrivalHubId && (
                    <span className="text-xs text-red-500 mt-1 block font-mono">
                        {fieldErrors.arrivalHubId}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="form-group">
                    <FormInput
                        id="pilotId"
                        label={t("details.pilotId")}
                        list="pilot-id-options"
                        value={formData.pilotId || ""}
                        disabled={isReadOnly}
                        onChange={(e) => {
                            onFormChange("pilotId", e.target.value);
                            onClearFieldError("pilotId");
                        }}
                        placeholder={t("details.pilotPlaceholder")}
                        error={fieldErrors.pilotId}
                        labelRight={
                            !isReadOnly && myPilotId && formData.pilotId !== myPilotId ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onFormChange("pilotId", myPilotId);
                                        onClearFieldError("pilotId");
                                    }}
                                    className="text-[11px] font-mono font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2 whitespace-nowrap shrink-0 mb-1.5 cursor-pointer"
                                >
                                    {t("details.useMine")}
                                </button>
                            ) : null
                        }
                    />
                    {pilotSuggestions.length > 0 && (
                        <datalist id="pilot-id-options">
                            {pilotSuggestions.map((pid) => (
                                <option key={pid} value={pid} />
                            ))}
                        </datalist>
                    )}
                </div>

                <div className="form-group">
                    <FormInput
                        id="cruisingAltitudeM"
                        label={t("details.cruisingAlt")}
                        type="number"
                        min={10}
                        max={1000}
                        value={formData.cruisingAltitudeM ?? 120}
                        disabled={isReadOnly}
                        onChange={(e) => {
                            const val = e.target.value;
                            onFormChange("cruisingAltitudeM", val === "" ? undefined : Number(val));
                        }}
                        placeholder="120"
                        error={fieldErrors.cruisingAltitudeM}
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="flightNotes">
                    {t("details.notesLabel")}
                </label>
                <textarea
                    id="flightNotes"
                    rows={3}
                    placeholder={t("details.notesPlaceholder")}
                    value={formData.notes || ""}
                    disabled={isReadOnly}
                    onChange={(e) => onFormChange("notes", e.target.value)}
                    className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] p-2.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:border-[var(--color-border-dark)] font-sans resize-none disabled:opacity-70"
                />
            </div>

            <FlightFeasibilityCard
                flightId={flightId}
                distanceM={totalDistanceM}
                drone={selectedDrone}
                overrideReason={
                    isReadOnly || !effectiveIsWarning ? formData.feasibilityOverride : undefined
                }
            />

            {showLiveConformance && conformance && (
                <div className="px-3 py-2.5 border border-[var(--color-border-default)] rounded-md bg-[var(--color-surface-subtle)] flex items-center justify-between gap-2 text-xs">
                    <div className="font-mono min-w-0">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 block">
                            {t("details.corridor4d")}
                        </span>
                        {(lateralErr != null || verticalErr != null) && (
                            <span className="text-[11px] text-slate-500 mt-0.5 block tabular-nums truncate">
                                {t("details.corridorMetrics", {
                                    lat: (lateralErr ?? 0).toFixed(1),
                                    latLimit: lateralLimit,
                                    vert: (verticalErr ?? 0).toFixed(1),
                                    vertLimit: verticalLimit,
                                })}
                            </span>
                        )}
                    </div>
                    <StatusBadge
                        status={conformance.status!}
                        label={
                            conformance.status === CONFORMANCE_STATUS.NON_CONFORMING
                                ? t("details.breach")
                                : undefined
                        }
                    />
                </div>
            )}

            {effectiveIsWarning && !isReadOnly && (
                <div className="form-group pt-1">
                    <label className="form-label" htmlFor="feasibilityOverride">
                        {t("details.overrideReasonLabel", {
                            verdict:
                                effectiveVerdict === FEASIBILITY_VERDICT.NO_GO
                                    ? t("feasibility.noGo")
                                    : t("feasibility.marginal"),
                        })}{" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="feasibilityOverride"
                        rows={2}
                        value={formData.feasibilityOverride || ""}
                        placeholder={t("details.overrideReasonPlaceholder")}
                        onChange={(e) => {
                            onFormChange("feasibilityOverride", e.target.value);
                            onClearFieldError("feasibilityOverride");
                        }}
                        className={cn(
                            "form-input resize-none text-xs",
                            fieldErrors.feasibilityOverride && "form-input-error"
                        )}
                    />
                    {fieldErrors.feasibilityOverride && (
                        <span className="form-error-msg">{fieldErrors.feasibilityOverride}</span>
                    )}
                    {mode === "edit" && flightId && (
                        <div className="flex justify-end pt-1">
                            <ChamferButton
                                size="xs"
                                variant="outline"
                                disabled={!canSubmitLiveOverride || overrideMutation.isPending}
                                onClick={() => overrideMutation.mutate(overrideReasonText)}
                            >
                                {overrideMutation.isPending
                                    ? t("details.authorizingOverride")
                                    : t("details.authorizeOverride")}
                            </ChamferButton>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
