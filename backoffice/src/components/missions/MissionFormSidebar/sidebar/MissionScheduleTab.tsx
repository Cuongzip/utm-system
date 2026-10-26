"use client";

import React from "react";
import { Clock, Play } from "lucide-react";
import { DateTimePicker } from "@/components/ui";
import { cn } from "@/lib";
import type { MissionScheduleType } from "@/types";

export interface MissionScheduleTabProps {
    scheduleType: MissionScheduleType;
    onScheduleTypeChange: (val: MissionScheduleType) => void;
    scheduledAt: string;
    onScheduledAtChange: (val: string) => void;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function MissionScheduleTab({
    scheduleType,
    onScheduleTypeChange,
    scheduledAt,
    onScheduledAtChange,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionScheduleTabProps) {
    return (
        <div className="space-y-4">
            <label className="form-label block">Schedule Type</label>

            <div
                onClick={() => !isReadOnly && onScheduleTypeChange("immediate")}
                className={cn(
                    "p-4 rounded-md border transition-all flex items-start gap-3.5",
                    isReadOnly ? "cursor-default opacity-80" : "cursor-pointer",
                    scheduleType === "immediate"
                        ? "border-[var(--color-border-dark)] bg-[var(--color-surface-card)] shadow-xs"
                        : "border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)]"
                )}
            >
                <div
                    className={cn(
                        "w-8 h-8 rounded flex items-center justify-center shrink-0 border transition-colors",
                        scheduleType === "immediate"
                            ? "bg-[var(--color-border-dark)] text-white border-[var(--color-border-dark)]"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                    )}
                >
                    <Play className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <span className="font-semibold text-xs text-[var(--color-text-primary)] block">
                        Immediate / Manual Start
                    </span>
                    <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed block mt-0.5">
                        Execute mission immediately or launch manually when ready
                    </span>
                </div>
            </div>

            <div
                onClick={() => !isReadOnly && onScheduleTypeChange("scheduled")}
                className={cn(
                    "p-4 rounded-md border transition-all flex flex-col gap-3",
                    isReadOnly ? "cursor-default opacity-80" : "cursor-pointer",
                    scheduleType === "scheduled"
                        ? "border-[var(--color-border-dark)] bg-[var(--color-surface-card)] shadow-xs"
                        : "border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)]"
                )}
            >
                <div className="flex items-start gap-3.5">
                    <div
                        className={cn(
                            "w-8 h-8 rounded flex items-center justify-center shrink-0 border transition-colors",
                            scheduleType === "scheduled"
                                ? "bg-[var(--color-border-dark)] text-white border-[var(--color-border-dark)]"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                        )}
                    >
                        <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <span className="font-semibold text-xs text-[var(--color-text-primary)] block">
                            Scheduled Departure
                        </span>
                        <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed block mt-0.5">
                            Start at a specific planned date and time
                        </span>
                    </div>
                </div>

                {scheduleType === "scheduled" && (
                    <div
                        className="pt-2 border-t border-[var(--color-border-default)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <label className="form-label block text-[11px] font-mono text-[var(--color-text-muted)] mb-1">
                            DEPARTURE DATE & TIME
                        </label>
                        <DateTimePicker
                            value={scheduledAt}
                            disabled={isReadOnly}
                            onChange={(val) => {
                                onScheduledAtChange(val);
                                onClearFieldError?.("scheduledAt");
                            }}
                            error={Boolean(fieldErrors.scheduledAt)}
                            placeholder="Select departure date & time"
                        />
                        {fieldErrors.scheduledAt && (
                            <span className="form-error-msg">{fieldErrors.scheduledAt}</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default MissionScheduleTab;
