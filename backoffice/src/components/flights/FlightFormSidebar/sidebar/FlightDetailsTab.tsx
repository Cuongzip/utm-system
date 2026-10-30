"use client";

import { AlertCircle, ShieldCheck } from "lucide-react";
import { CustomSelect, FormInput, type SelectOption } from "@/components/ui";
import {
    cn,
    formatDistance,
    estimateFlightDurationMinutes,
    estimateBatteryPercentage,
} from "@/utils";

export interface FlightDetailsTabProps {
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
    droneOptions: SelectOption[];
    hubOptions: SelectOption[];
    totalDistanceM: number;
    waypointsCount: number;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function FlightDetailsTab({
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
    droneOptions,
    hubOptions,
    totalDistanceM,
    waypointsCount,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: FlightDetailsTabProps) {
    const isFeasible = Boolean(departureHubId && arrivalHubId);
    const estimatedMinutes = estimateFlightDurationMinutes(totalDistanceM);
    const estimatedBatteryPct = estimateBatteryPercentage(totalDistanceM);

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
                {mode === "edit" && (
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-mono">
                        Flight number cannot be changed once created.
                    </p>
                )}
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

            <div className="pt-2">
                <label className="form-label mb-1.5 block">Flight Route Feasibility</label>
                <div className="p-3.5 border border-dashed border-[var(--color-border-default)] rounded-md bg-[var(--color-surface-card)]/60 text-xs text-[var(--color-text-secondary)]">
                    {!isFeasible ? (
                        <div className="flex items-start gap-2 text-[var(--color-text-muted)]">
                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                                Select departure and arrival vertiports to verify route distance and
                                feasibility.
                            </span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    ROUTE FEASIBLE
                                </span>
                                <span className="text-[var(--color-text-primary)] font-bold">
                                    {formatDistance(totalDistanceM)}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border-default)] text-[11px] font-mono">
                                <div>
                                    <span className="text-[var(--color-text-muted)]">
                                        Est. Flight:
                                    </span>{" "}
                                    <span className="text-[var(--color-text-primary)] font-semibold">
                                        ~{estimatedMinutes} mins
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[var(--color-text-muted)]">
                                        Est. Battery:
                                    </span>{" "}
                                    <span className="text-[var(--color-text-primary)] font-semibold">
                                        ~{estimatedBatteryPct}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default FlightDetailsTab;
