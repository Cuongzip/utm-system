"use client";

import { Clock, Calendar, AlertCircle } from "lucide-react";
import { DateTimePicker } from "@/components/ui";

export interface FlightScheduleTabProps {
    scheduledDeparture: string;
    onScheduledDepartureChange: (val: string) => void;
    scheduledArrival: string;
    onScheduledArrivalChange: (val: string) => void;
    durationMinutes: number | null;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function FlightScheduleTab({
    scheduledDeparture,
    onScheduledDepartureChange,
    scheduledArrival,
    onScheduledArrivalChange,
    durationMinutes,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: FlightScheduleTabProps) {
    return (
        <div className="space-y-4">
            <label className="form-label block">Flight Operation Window</label>

            <div className="p-4 rounded-md border border-[var(--color-border-dark)] bg-[var(--color-surface-card)] shadow-xs flex flex-col gap-3.5">
                <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded flex items-center justify-center shrink-0 border bg-[var(--color-border-dark)] text-white border-[var(--color-border-dark)]">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <span className="font-semibold text-xs text-[var(--color-text-primary)] block">
                            Scheduled Flight Times
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed block mt-0.5">
                            Defined 4D departure and arrival clearance window
                        </span>
                    </div>
                </div>

                <div className="pt-2 border-t border-[var(--color-border-default)] space-y-3">
                    <div className="form-group">
                        <label className="form-label block text-[11px] font-mono text-[var(--color-text-muted)] mb-1">
                            SCHEDULED DEPARTURE TIME <span className="text-red-500">*</span>
                        </label>
                        <DateTimePicker
                            value={scheduledDeparture}
                            onChange={(val) => {
                                onScheduledDepartureChange(val);
                                onClearFieldError?.("scheduledDeparture");
                            }}
                            disabled={isReadOnly}
                            error={Boolean(fieldErrors.scheduledDeparture)}
                            placeholder="Select departure date & time"
                        />
                        {fieldErrors.scheduledDeparture && (
                            <span className="text-xs text-red-500 mt-1 block font-mono">
                                {fieldErrors.scheduledDeparture}
                            </span>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label block text-[11px] font-mono text-[var(--color-text-muted)] mb-1">
                            SCHEDULED ARRIVAL TIME <span className="text-red-500">*</span>
                        </label>
                        <DateTimePicker
                            value={scheduledArrival}
                            onChange={(val) => {
                                onScheduledArrivalChange(val);
                                onClearFieldError?.("scheduledArrival");
                            }}
                            disabled={isReadOnly}
                            error={Boolean(fieldErrors.scheduledArrival)}
                            placeholder="Select arrival date & time"
                        />
                        {fieldErrors.scheduledArrival && (
                            <span className="text-xs text-red-500 mt-1 block font-mono">
                                {fieldErrors.scheduledArrival}
                            </span>
                        )}
                    </div>

                    {durationMinutes !== null ? (
                        <div className="p-2.5 rounded bg-[var(--color-surface-panel)] border border-[var(--color-border-default)] flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--color-text-muted)]">
                                ESTIMATED DURATION:
                            </span>
                            <span className="font-bold text-[var(--color-text-primary)]">
                                {Math.floor(durationMinutes / 60) > 0
                                    ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                                    : `${durationMinutes} mins`}
                            </span>
                        </div>
                    ) : (
                        scheduledDeparture &&
                        scheduledArrival && (
                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-mono">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>Arrival time must be later than departure time</span>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default FlightScheduleTab;
