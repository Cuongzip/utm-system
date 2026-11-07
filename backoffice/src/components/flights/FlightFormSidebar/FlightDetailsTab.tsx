"use client";

import { CustomSelect, FormInput, AutoGenInput, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import { FlightFeasibilityCard } from "../FlightFeasibilityCard";
import type { Drone, FeasibilityVerdict, FlightFormPayload } from "@/types";

export interface FlightDetailsTabProps {
    formData: FlightFormPayload;
    onFormChange: <K extends keyof FlightFormPayload>(
        field: K,
        value: FlightFormPayload[K]
    ) => void;
    mode: "create" | "edit";
    drones?: Drone[];
    droneOptions: SelectOption[];
    hubOptions: SelectOption[];
    totalDistanceM: number;
    feasibilityVerdict?: FeasibilityVerdict;
    isFeasibilityWarning?: boolean;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
}

export function FlightDetailsTab({
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
}: FlightDetailsTabProps) {
    const selectedDrone = drones.find((d) => d.id === formData.droneId) || null;

    return (
        <div className="space-y-4">
            <div className="form-group">
                <AutoGenInput
                    id="flightNumber"
                    label="Flight Number / Callsign"
                    showAutoGen={mode === "create"}
                    disabled={isReadOnly || mode === "edit"}
                    manualPlaceholder="e.g. FL-2026-001"
                    value={formData.flightNumber ?? ""}
                    onChange={(e) => onFormChange("flightNumber", e.target.value)}
                    error={fieldErrors.flightNumber}
                />
            </div>

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
                        onChange={(e) =>
                            onFormChange("cruisingAltitudeM", Number(e.target.value) || 0)
                        }
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
                    className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] p-2.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:border-[var(--color-border-dark)] font-sans resize-none"
                />
            </div>

            <FlightFeasibilityCard
                initialOverride={formData.feasibilityOverride}
                distanceM={totalDistanceM}
                drone={selectedDrone}
            />

            {isFeasibilityWarning && (
                <div className="form-group pt-1">
                    <label className="form-label" htmlFor="feasibilityOverride">
                        Feasibility Reason ({feasibilityVerdict === "no_go" ? "No Go" : "Marginal"}){" "}
                        <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="feasibilityOverride"
                        rows={2}
                        value={formData.feasibilityOverride || ""}
                        disabled={isReadOnly}
                        placeholder="Enter reason..."
                        onChange={(e) => onFormChange("feasibilityOverride", e.target.value)}
                        className={cn(
                            "w-full rounded-md border bg-[var(--color-surface-panel)] p-2.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden font-sans resize-none",
                            fieldErrors.feasibilityOverride
                                ? "border-red-500 focus:border-red-500"
                                : "border-[var(--color-border-default)] focus:border-[var(--color-border-dark)]"
                        )}
                    />
                    {fieldErrors.feasibilityOverride && (
                        <p className="text-xs text-red-500 mt-1">
                            {fieldErrors.feasibilityOverride}
                        </p>
                    )}
                </div>
            )}

            {!isFeasibilityWarning && formData.feasibilityOverride && (
                <div className="form-group pt-1">
                    <label className="form-label text-[var(--color-text-muted)]">
                        Feasibility Reason
                    </label>
                    <p className="text-xs text-[var(--color-text-primary)] font-mono">
                        {formData.feasibilityOverride}
                    </p>
                </div>
            )}
        </div>
    );
}
