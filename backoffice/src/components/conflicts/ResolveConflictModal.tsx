"use client";

import React, { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Compass, Check, AlertTriangle } from "lucide-react";
import { Modal, CustomSelect, FormInput, Skeleton, TacticalCallout } from "@/components/ui";
import { useConflictAdvice, useEntityCodeMap } from "@/hooks";
import type { AppLocale } from "@/i18n";
import { localizeServerText, validateSchema } from "@/utils";
import { resolveConflictBody } from "@/generated/conflict";
import {
    RESOLUTION_STRATEGIES,
    RESOLUTION_STRATEGY,
    type Conflict,
    type ResolveConflictPayload,
    type ResolutionAdviceOption,
    type ResolutionStrategy,
} from "@/types";

export interface ResolveConflictModalProps {
    isOpen: boolean;
    conflict: Conflict | null;
    onClose: () => void;
    onResolve: (id: string, payload: ResolveConflictPayload) => Promise<void> | void;
    isSubmitting: boolean;
}

function matchResolutionStrategy(raw?: string): ResolutionStrategy {
    if (!raw) return RESOLUTION_STRATEGY.ALTITUDE_CHANGE;
    const normalized = raw.toLowerCase();
    const matched = RESOLUTION_STRATEGIES.find((s) => s.toLowerCase() === normalized);
    return matched ?? RESOLUTION_STRATEGY.ALTITUDE_CHANGE;
}

interface ResolveConflictModalBodyProps {
    conflict: Conflict;
    onClose: () => void;
    onResolve: (id: string, payload: ResolveConflictPayload) => Promise<void> | void;
    isSubmitting: boolean;
}

function ResolveConflictModalBody({
    conflict,
    onClose,
    onResolve,
    isSubmitting,
}: ResolveConflictModalBodyProps) {
    const locale = useLocale() as AppLocale;
    const t = useTranslations("conflicts");
    const entityMap = useEntityCodeMap();
    const [strategy, setStrategy] = useState<ResolutionStrategy>(
        RESOLUTION_STRATEGY.ALTITUDE_CHANGE
    );
    const [notes, setNotes] = useState("");
    const [targetAltitudeM, setTargetAltitudeM] = useState<string>("");
    const [targetSpeed, setTargetSpeed] = useState<string>("");
    const [selectedAdviceRank, setSelectedAdviceRank] = useState<number | null>(null);

    const strategyOptions = useMemo(
        () =>
            RESOLUTION_STRATEGIES.map((s) => ({
                value: s,
                label: t.has(`strategies.${s}`)
                    ? t(`strategies.${s}`)
                    : s.replace(/_/g, " ").toUpperCase(),
            })),
        [t]
    );

    const formatStrategyLabel = (raw?: string) => {
        if (!raw) return "";
        const normalized = raw.toLowerCase();
        const knownKeys = [
            "hover",
            "reroute",
            "divert_altitude",
            "return_to_base",
            "speed_adjustment",
            "altitude_change",
            "hold",
            "auto_cleared",
        ] as const;
        if ((knownKeys as readonly string[]).includes(normalized)) {
            return t(`strategies.${normalized as (typeof knownKeys)[number]}`);
        }
        return raw.replace(/_/g, " ").toUpperCase();
    };

    const { data: advice, isLoading: adviceLoading } = useConflictAdvice(
        conflict.id,
        Boolean(conflict.id)
    );

    const isAltitudeStrategy =
        strategy === RESOLUTION_STRATEGY.ALTITUDE_CHANGE ||
        strategy === RESOLUTION_STRATEGY.DIVERT_ALTITUDE;
    const isSpeedStrategy = strategy === RESOLUTION_STRATEGY.SPEED_ADJUSTMENT;

    const applyAdviceOption = (option: ResolutionAdviceOption) => {
        const mappedStrategy = matchResolutionStrategy(option.strategy);
        setStrategy(mappedStrategy);
        setSelectedAdviceRank(option.rank);
        setNotes(
            option.rationale ? localizeServerText(option.rationale, locale, { entityMap }) : ""
        );

        const actions = option.recommendedActions || {};
        const altCandidate = actions.targetAltitudeM ?? actions.altitudeM ?? actions.newAltitudeM;
        setTargetAltitudeM(altCandidate != null ? String(altCandidate) : "");

        const speedCandidate = actions.targetSpeed ?? actions.speedMs ?? actions.targetSpeedMs;
        setTargetSpeed(speedCandidate != null ? String(speedCandidate) : "");
    };

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

        const validation = validateSchema<ResolveConflictPayload>(resolveConflictBody, {
            strategy,
            actions,
        });
        if (!validation.success) return;

        await onResolve(conflict.id, validation.data);
    };

    const conflictTitle =
        conflict.conflictType && t.has(`types.${conflict.conflictType}`)
            ? t(`types.${conflict.conflictType}`)
            : conflict.conflictType
              ? conflict.conflictType.replace(/_/g, " ").toUpperCase()
              : t("fallbackType");

    const adviceOptions = advice?.options
        ? [...advice.options].sort((a, b) => a.rank - b.rank)
        : [];

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t("modal.title")}
            maxWidth="520px"
            onSubmit={handleSubmit}
            loading={isSubmitting}
            submitText={t("modal.submitText")}
            loadingText={t("modal.loadingText")}
        >
            <TacticalCallout
                tone="warning"
                icon={AlertTriangle}
                title={conflictTitle}
                description={
                    conflict.description
                        ? localizeServerText(conflict.description, locale, { entityMap })
                        : undefined
                }
                rightSlot={
                    <span className="text-[11px] font-mono text-slate-500 uppercase">
                        CNF-{conflict.id.slice(0, 6).toUpperCase()}
                    </span>
                }
            />

            {(adviceLoading || adviceOptions.length > 0) && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800">
                            <Compass className="w-3.5 h-3.5 text-slate-600" />
                            <span>{t("modal.advisorTitle")}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 uppercase">
                            {t("modal.selectManeuver")}
                        </span>
                    </div>

                    {adviceLoading ? (
                        <div
                            role="status"
                            aria-busy="true"
                            aria-label={t("modal.computingAria")}
                            className="space-y-1.5"
                        >
                            {Array.from({ length: 2 }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className="p-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex flex-col gap-1.5"
                                >
                                    <div className="flex items-center justify-between">
                                        <Skeleton className="h-3.5 w-36" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                    <Skeleton className="h-3 w-56" />
                                </div>
                            ))}
                            <span className="sr-only">{t("modal.computingAria")}</span>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {adviceOptions.slice(0, 3).map((opt) => {
                                const isSelected = selectedAdviceRank === opt.rank;
                                const isRecommended = opt.rank === 1;
                                return (
                                    <button
                                        key={opt.rank}
                                        type="button"
                                        onClick={() => applyAdviceOption(opt)}
                                        className={`w-full text-left p-2.5 rounded-md border transition-colors cursor-pointer text-xs ${
                                            isSelected
                                                ? "border-[var(--color-border-dark)] bg-[var(--color-surface-card)]"
                                                : "border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-subtle)]"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                                                {isSelected && (
                                                    <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                                                )}
                                                <span>{formatStrategyLabel(opt.strategy)}</span>
                                                {isRecommended && (
                                                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white text-[10px]">
                                                        {t("modal.recommended")}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-mono text-[11px] text-slate-500 shrink-0 tabular-nums">
                                                {t("modal.sepGain", {
                                                    gain: Math.round(opt.expectedSeparationGainM),
                                                })}
                                                {opt.estimatedDelaySeconds > 0
                                                    ? ` · +${opt.estimatedDelaySeconds}s`
                                                    : ""}
                                            </span>
                                        </div>
                                        {opt.rationale && (
                                            <p className="mt-1 text-[11px] text-slate-600 leading-snug">
                                                {localizeServerText(opt.rationale, locale, {
                                                    entityMap,
                                                })}
                                            </p>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="form-group">
                <label className="form-label" htmlFor="resolution-strategy">
                    {t("modal.strategyLabel")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    id="resolution-strategy"
                    value={strategy}
                    onValueChange={(val: string) => {
                        setStrategy(val as ResolutionStrategy);
                        setSelectedAdviceRank(null);
                    }}
                    options={strategyOptions}
                    placeholder={t("modal.strategyPlaceholder")}
                />
            </div>

            {isAltitudeStrategy && (
                <FormInput
                    id="target-altitude"
                    label={t("modal.targetAltitude")}
                    type="number"
                    value={targetAltitudeM}
                    onChange={(e) => setTargetAltitudeM(e.target.value)}
                    placeholder={t("modal.targetAltitudePlaceholder")}
                />
            )}

            {isSpeedStrategy && (
                <FormInput
                    id="target-speed"
                    label={t("modal.targetSpeed")}
                    type="number"
                    value={targetSpeed}
                    onChange={(e) => setTargetSpeed(e.target.value)}
                    placeholder={t("modal.targetSpeedPlaceholder")}
                />
            )}

            <div className="form-group">
                <label className="form-label" htmlFor="resolution-notes">
                    {t("modal.operatorNotes")}
                </label>
                <textarea
                    id="resolution-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("modal.notesPlaceholder")}
                    className="form-input resize-none"
                />
            </div>
        </Modal>
    );
}

export function ResolveConflictModal({
    isOpen,
    conflict,
    onClose,
    onResolve,
    isSubmitting = false,
}: ResolveConflictModalProps) {
    if (!isOpen || !conflict) return null;

    return (
        <ResolveConflictModalBody
            key={conflict.id}
            conflict={conflict}
            onClose={onClose}
            onResolve={onResolve}
            isSubmitting={isSubmitting}
        />
    );
}
