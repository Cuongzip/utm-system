"use client";

import React from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { CustomSelect, FormInput, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";

export interface MissionDetailsTabProps {
    name: string;
    onNameChange: (val: string) => void;
    description: string;
    onDescriptionChange: (val: string) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    departureHubId: string;
    onDepartureHubIdChange: (val: string) => void;
    arrivalHubId: string;
    onArrivalHubIdChange: (val: string) => void;
    droneOptions: SelectOption[];
    hubOptions: SelectOption[];
    arrivalHubOptions: SelectOption[];
    totalDistanceM: number;
    waypointsCount: number;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function MissionDetailsTab({
    name,
    onNameChange,
    description,
    onDescriptionChange,
    droneId,
    onDroneIdChange,
    departureHubId,
    onDepartureHubIdChange,
    arrivalHubId,
    onArrivalHubIdChange,
    droneOptions,
    hubOptions,
    arrivalHubOptions,
    totalDistanceM,
    waypointsCount,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionDetailsTabProps) {
    const isFeasible = Boolean(departureHubId && waypointsCount > 0);
    const estimatedMinutes = totalDistanceM > 0 ? Math.ceil(totalDistanceM / 1000 / 0.5) : 0;
    const estimatedBatteryPct = Math.min(100, Math.ceil((totalDistanceM / 1000) * 4));

    return (
        <div className="space-y-4">
            <FormInput
                id="missionName"
                label="Mission Name"
                required
                placeholder="Enter mission name"
                value={name}
                disabled={isReadOnly}
                onChange={(e) => {
                    onNameChange(e.target.value);
                    onClearFieldError?.("name");
                }}
                error={fieldErrors.name}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="missionDesc">
                    Description
                </label>
                <textarea
                    id="missionDesc"
                    rows={3}
                    placeholder="Optional description"
                    value={description}
                    disabled={isReadOnly}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    className="form-input resize-none"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Assigned Drone</label>
                <CustomSelect
                    value={droneId}
                    disabled={isReadOnly}
                    onValueChange={onDroneIdChange}
                    options={droneOptions}
                    placeholder="Select drone"
                />
            </div>

            <div className="form-group">
                <label className="form-label">
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
                    placeholder="Select departure hub"
                    className={cn(fieldErrors.departureHubId && "form-input-error")}
                />
                {fieldErrors.departureHubId && (
                    <span className="form-error-msg">{fieldErrors.departureHubId}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Arrival Vertiport</label>
                <CustomSelect
                    value={arrivalHubId}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onArrivalHubIdChange(val);
                        onClearFieldError?.("arrivalHubId");
                    }}
                    options={arrivalHubOptions}
                    placeholder="Same as departure"
                    className={cn(fieldErrors.arrivalHubId && "form-input-error")}
                />
                {fieldErrors.arrivalHubId && (
                    <span className="form-error-msg">{fieldErrors.arrivalHubId}</span>
                )}
            </div>

            <div className="pt-2">
                <label className="form-label mb-1.5 block">Mission Feasibility</label>
                <div className="p-3.5 border border-dashed border-[var(--color-border-default)] rounded-md bg-[var(--color-surface-card)]/60 text-xs text-[var(--color-text-secondary)]">
                    {!isFeasible ? (
                        <div className="flex items-start gap-2 text-[var(--color-text-muted)]">
                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <span>
                                Select departure vertiport and add waypoints on the map to verify
                                route feasibility.
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
                                    {(totalDistanceM / 1000).toFixed(1)} km
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

export default MissionDetailsTab;
