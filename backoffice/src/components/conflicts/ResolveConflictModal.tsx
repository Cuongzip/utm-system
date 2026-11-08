"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Modal, CustomSelect, FormInput } from "@/components/ui";
import {
    RESOLUTION_STRATEGIES,
    RESOLUTION_STRATEGY,
    type Conflict,
    type ResolveConflictPayload,
    type ResolutionStrategy,
} from "@/types";

export interface ResolveConflictModalProps {
    isOpen: boolean;
    conflict: Conflict | null;
    onClose: () => void;
    onResolve: (id: string, payload: ResolveConflictPayload) => Promise<void> | void;
    isSubmitting?: boolean;
}

const STRATEGY_OPTIONS = RESOLUTION_STRATEGIES.map((strategy) => ({
    value: strategy,
    label: strategy.replace(/_/g, " ").toUpperCase(),
}));

export function ResolveConflictModal({
    isOpen,
    conflict,
    onClose,
    onResolve,
    isSubmitting = false,
}: ResolveConflictModalProps) {
    const [strategy, setStrategy] = useState<ResolutionStrategy>(
        RESOLUTION_STRATEGY.ALTITUDE_CHANGE
    );
    const [notes, setNotes] = useState("");
    const [targetAltitudeM, setTargetAltitudeM] = useState<string>("");
    const [targetSpeed, setTargetSpeed] = useState<string>("");

    useEffect(() => {
        if (isOpen) {
            setStrategy(RESOLUTION_STRATEGY.ALTITUDE_CHANGE);
            setNotes("");
            setTargetAltitudeM("");
            setTargetSpeed("");
        }
    }, [isOpen]);

    if (!conflict) return null;

    const isAltitudeStrategy =
        strategy === RESOLUTION_STRATEGY.ALTITUDE_CHANGE ||
        strategy === RESOLUTION_STRATEGY.DIVERT_ALTITUDE;
    const isSpeedStrategy = strategy === RESOLUTION_STRATEGY.SPEED_ADJUSTMENT;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const actions: Record<string, unknown> = {
            notes: notes.trim() || undefined,
            appliedAt: new Date().toISOString(),
        };

        if (isAltitudeStrategy && targetAltitudeM !== "") {
            actions.targetAltitudeM = Number(targetAltitudeM);
        }

        if (isSpeedStrategy && targetSpeed !== "") {
            actions.targetSpeed = Number(targetSpeed);
        }

        await onResolve(conflict.id, {
            strategy,
            actions,
        });
    };

    const conflictTitle = conflict.conflictType
        ? conflict.conflictType.replace(/_/g, " ").toUpperCase()
        : "AIRSPACE CONFLICT";

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Resolve Airspace Conflict"
            icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
            maxWidth="520px"
            onSubmit={handleSubmit}
            loading={isSubmitting}
            submitText="Apply Resolution"
            cancelText="Cancel"
            loadingText="Applying Resolution..."
        >
            <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-slate-800 font-bold">
                        <span>{conflictTitle}</span>
                        <span className="text-[11px] text-slate-500 uppercase">
                            ID: {conflict.id.slice(0, 8)}
                        </span>
                    </div>
                    {conflict.description && (
                        <p className="text-[11px] text-slate-600 font-sans leading-relaxed">
                            {conflict.description}
                        </p>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="resolution-strategy">
                        RESOLUTION STRATEGY *
                    </label>
                    <CustomSelect
                        value={strategy}
                        onValueChange={(val: string) => setStrategy(val as ResolutionStrategy)}
                        options={STRATEGY_OPTIONS}
                        placeholder="Select strategy..."
                    />
                </div>

                {isAltitudeStrategy && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="target-altitude">
                            TARGET ALTITUDE (METERS MSL)
                        </label>
                        <FormInput
                            id="target-altitude"
                            type="number"
                            value={targetAltitudeM}
                            onChange={(e) => setTargetAltitudeM(e.target.value)}
                            placeholder="e.g. 150"
                        />
                    </div>
                )}

                {isSpeedStrategy && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="target-speed">
                            TARGET SPEED (M/S)
                        </label>
                        <FormInput
                            id="target-speed"
                            type="number"
                            value={targetSpeed}
                            onChange={(e) => setTargetSpeed(e.target.value)}
                            placeholder="e.g. 12"
                        />
                    </div>
                )}

                <div className="form-group">
                    <label className="form-label" htmlFor="resolution-notes">
                        TACTICAL DIRECTIVES & OPERATOR NOTES
                    </label>
                    <textarea
                        id="resolution-notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Specify avoidance vector, clearance rationale, or ATC instructions..."
                        className="form-input resize-none"
                    />
                </div>
            </div>
        </Modal>
    );
}
