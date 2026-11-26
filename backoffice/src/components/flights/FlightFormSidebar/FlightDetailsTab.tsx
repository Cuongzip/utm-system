"use client";

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
import { QUERY_KEYS, useCurrentUser, useFlightConformance, useFlightFeasibility } from "@/hooks";
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

export interface FlightDetailsTabProps {
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
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    const selectedDrone = drones.find((d) => d.id === formData.droneId) || null;
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
            toast.success("Feasibility override recorded and flight authorized");
            if (flightId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flightId) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightFeasibility(flightId) });
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        },
        meta: { defaultErrorMessage: "Failed to override feasibility verdict" },
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
                label="Flight Number"
                showAutoGen={mode !== "edit"}
                disabled={mode === "edit" || isReadOnly}
                required={mode !== "edit"}
                manualPlaceholder="e.g. FL-2026-001"
                value={formData.flightNumber ?? ""}
                onChange={(e) => {
                    onFormChange("flightNumber", e.target.value);
                    onClearFieldError("flightNumber");
                }}
                error={fieldErrors.flightNumber}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="droneId">
                    Assigned Drone <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.droneId}
                    disabled={isReadOnly}
                    onValueChange={(val) => onFormChange("droneId", val)}
                    options={droneOptions}
                    placeholder="Select assigned drone"
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
                    Departure Vertiport <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.departureHubId}
                    disabled={isReadOnly}
                    onValueChange={(val) => onFormChange("departureHubId", val)}
                    options={hubOptions}
                    placeholder="Select departure vertiport"
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
                    Arrival Vertiport <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.arrivalHubId}
                    disabled={isReadOnly}
                    onValueChange={(val) => onFormChange("arrivalHubId", val)}
                    options={hubOptions}
                    placeholder="Select arrival vertiport"
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
                        label="Remote Pilot ID"
                        value={formData.pilotId || ""}
                        disabled={isReadOnly}
                        onChange={(e) => onFormChange("pilotId", e.target.value)}
                        placeholder="e.g. PILOT-VN-007"
                        error={fieldErrors.pilotId}
                    />
                </div>

                <div className="form-group">
                    <FormInput
                        id="cruisingAltitudeM"
                        label="Cruising Alt. (m)"
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
                    Flight Remarks & Route Notes
                </label>
                <textarea
                    id="flightNotes"
                    rows={3}
                    placeholder="Operational remarks, weather briefings, or cargo manifests..."
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
                            4D Corridor
                        </span>
                        {(lateralErr != null || verticalErr != null) && (
                            <span className="text-[11px] text-slate-500 mt-0.5 block tabular-nums truncate">
                                Lat {(lateralErr ?? 0).toFixed(1)}/{lateralLimit}m · Alt Δ{" "}
                                {(verticalErr ?? 0).toFixed(1)}/{verticalLimit}m
                            </span>
                        )}
                    </div>
                    <StatusBadge
                        status={conformance.status!}
                        label={
                            conformance.status === CONFORMANCE_STATUS.NON_CONFORMING
                                ? "BREACH"
                                : undefined
                        }
                    />
                </div>
            )}

            {effectiveIsWarning && !isReadOnly && (
                <div className="form-group pt-1">
                    <label className="form-label" htmlFor="feasibilityOverride">
                        Feasibility Override Reason (
                        {effectiveVerdict === FEASIBILITY_VERDICT.NO_GO ? "No Go" : "Marginal"}){" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="feasibilityOverride"
                        rows={2}
                        value={formData.feasibilityOverride || ""}
                        placeholder="Enter ATC justification (min 10 characters)..."
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
                                    ? "Authorizing..."
                                    : "Authorize Override"}
                            </ChamferButton>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
