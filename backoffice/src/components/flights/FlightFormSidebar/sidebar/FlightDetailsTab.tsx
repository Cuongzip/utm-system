"use client";

import { CustomSelect, FormInput, type SelectOption } from "@/components/ui";
import { cn } from "@/utils";
import { FlightFeasibilityCard } from "../../FlightFeasibilityCard";
import type { Drone, FeasibilityVerdict } from "@/types";

export interface FlightDetailsTabProps {
    flightId?: string;
    mode: "create" | "edit";
    flightNumber: string;
    onFlightNumberChange: (val: string) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    departureHubId: string;
    onDepartureHubIdChange: (val: string) => void;
    arrivalHubId: string;
    onArrivalHubIdChange: (val: string) => void;
    pilotId: string;
    onPilotIdChange: (val: string) => void;
    cruisingAltitudeM: number;
    onCruisingAltitudeMChange: (val: number) => void;
    notes: string;
    onNotesChange: (val: string) => void;
    executionId?: string;
    onExecutionIdChange?: (val: string) => void;
    drones?: Drone[];
    droneOptions: SelectOption[];
    hubOptions: SelectOption[];
    totalDistanceM: number;
    waypointsCount: number;
    feasibilityVerdict?: FeasibilityVerdict;
    feasibilityOverride?: string;
    onFeasibilityOverrideChange?: (val: string) => void;
    isFeasibilityWarning?: boolean;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function FlightDetailsTab({
    flightId,
    mode,
    flightNumber,
    onFlightNumberChange,
    droneId,
    onDroneIdChange,
    departureHubId,
    onDepartureHubIdChange,
    arrivalHubId,
    onArrivalHubIdChange,
    pilotId,
    onPilotIdChange,
    cruisingAltitudeM,
    onCruisingAltitudeMChange,
    notes,
    onNotesChange,
    executionId = "",
    onExecutionIdChange,
    drones = [],
    droneOptions,
    hubOptions,
    totalDistanceM,
    waypointsCount: _waypointsCount,
    feasibilityVerdict,
    feasibilityOverride = "",
    onFeasibilityOverrideChange,
    isFeasibilityWarning = false,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: FlightDetailsTabProps) {
    const selectedDrone = drones.find((d) => d.id === droneId) || null;
    return (
        <div className="space-y-4">
            <div className="form-group">
                <FormInput
                    id="flightNumber"
                    label="Flight Number / Callsign"
                    required
                    value={flightNumber}
                    disabled={isReadOnly || mode === "edit"}
                    onChange={(e) => {
                        onFlightNumberChange(e.target.value);
                        onClearFieldError?.("flightNumber");
                    }}
                    placeholder="e.g. FL-2026-001"
                    error={fieldErrors.flightNumber}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="droneId">
                    Assigned Drone <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={droneId}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onDroneIdChange(val);
                        onClearFieldError?.("droneId");
                    }}
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
                    value={departureHubId}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onDepartureHubIdChange(val);
                        onClearFieldError?.("departureHubId");
                    }}
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
                    value={arrivalHubId}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onArrivalHubIdChange(val);
                        onClearFieldError?.("arrivalHubId");
                    }}
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
                        value={pilotId}
                        disabled={isReadOnly}
                        onChange={(e) => {
                            onPilotIdChange(e.target.value);
                            onClearFieldError?.("pilotId");
                        }}
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
                        value={cruisingAltitudeM || ""}
                        disabled={isReadOnly}
                        onChange={(e) => {
                            onCruisingAltitudeMChange(Number(e.target.value) || 0);
                            onClearFieldError?.("cruisingAltitudeM");
                        }}
                        placeholder="120"
                        error={fieldErrors.cruisingAltitudeM}
                    />
                </div>
            </div>

            {onExecutionIdChange && (
                <div className="form-group">
                    <FormInput
                        id="executionId"
                        label="Associated Mission Execution ID"
                        value={executionId}
                        disabled={isReadOnly}
                        onChange={(e) => {
                            onExecutionIdChange(e.target.value);
                            onClearFieldError?.("executionId");
                        }}
                        placeholder="Optional execution UUID"
                    />
                </div>
            )}

            <div className="form-group">
                <label className="form-label" htmlFor="flightNotes">
                    Flight Remarks & Route Notes
                </label>
                <textarea
                    id="flightNotes"
                    rows={3}
                    placeholder="Operational remarks, weather briefings, or cargo manifests..."
                    value={notes}
                    disabled={isReadOnly}
                    onChange={(e) => {
                        onNotesChange(e.target.value);
                        onClearFieldError?.("notes");
                    }}
                    className="w-full rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] p-2.5 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-hidden focus:border-[var(--color-border-dark)] font-sans resize-none"
                />
            </div>

            <FlightFeasibilityCard
                flightId={flightId}
                mode={mode}
                initialVerdict={feasibilityVerdict}
                initialOverride={feasibilityOverride}
                isReadOnly={isReadOnly}
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
                        value={feasibilityOverride}
                        disabled={isReadOnly}
                        placeholder="Enter reason..."
                        onChange={(e) => {
                            onFeasibilityOverrideChange?.(e.target.value);
                            onClearFieldError?.("feasibilityOverride");
                        }}
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

            {!isFeasibilityWarning && feasibilityOverride && (
                <div className="form-group pt-1">
                    <label className="form-label text-[var(--color-text-muted)]">
                        Feasibility Reason
                    </label>
                    <p className="text-xs text-[var(--color-text-primary)] font-mono">
                        {feasibilityOverride}
                    </p>
                </div>
            )}
        </div>
    );
}

export default FlightDetailsTab;
