"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { X, Loader2, ShieldAlert, CheckCircle2, Eye, RefreshCw } from "lucide-react";
import { intelligenceService } from "@/services";
import type {
    ForesightPredictedConflict,
    ForesightResolutionOption,
    ForesightPrediction,
} from "@/types";

interface AirTrafficDirectorPanelProps {
    conflict: ForesightPredictedConflict;
    horizonSec: number;
    onPreviewSimulated: (sim: ForesightPrediction) => void;
    onClose: () => void;
}

export function AirTrafficDirectorPanel({
    conflict,
    horizonSec,
    onPreviewSimulated,
    onClose,
}: AirTrafficDirectorPanelProps) {
    const t = useTranslations("foresight");
    const tCommon = useTranslations("common");

    const adviseMutation = useMutation({
        mutationFn: () => intelligenceService.adviseForesight({ conflict }),
        meta: { defaultErrorMessage: t("director.adviseFailed") },
    });

    const simulateMutation = useMutation({
        mutationFn: (option: ForesightResolutionOption) =>
            intelligenceService.simulateResolution({
                maneuvers: [
                    {
                        objectId: option.objectId ?? conflict.primary?.id,
                        kind: option.kind,
                        delaySec: option.delaySec,
                        altitudeDeltaM: option.altitudeDeltaM,
                        lateralOffsetM: option.lateralOffsetM,
                    },
                ],
                horizon: horizonSec,
                step: 10,
            }),
        meta: { defaultErrorMessage: t("director.simulateFailed") },
        onSuccess: (sim) => {
            onPreviewSimulated(sim);
        },
    });

    const adviseTrigger = adviseMutation.mutate;
    useEffect(() => {
        adviseTrigger();
    }, [conflict.id, adviseTrigger]);

    const advice = adviseMutation.data;

    return (
        <div className="absolute top-16 right-4 z-30 w-[340px] max-w-[calc(100%-2rem)] max-h-[calc(100%-7.5rem)] chamfer-sm bg-slate-900/95 border border-slate-700 shadow-2xl text-slate-100 flex flex-col overflow-hidden pointer-events-auto">
            <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="min-w-0">
                        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-white truncate">
                            {t("director.title")}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                            {conflict.primary?.label || "UAV-1"} ×{" "}
                            {conflict.secondary?.label || "UAV-2"} ·{" "}
                            {Math.round(conflict.minSeparationM ?? 0)}m
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={t("director.closeAria")}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-3.5 overflow-y-auto flex flex-col gap-3 text-xs">
                {adviseMutation.isPending ? (
                    <div
                        role="status"
                        aria-busy="true"
                        aria-label={t("director.computingAria")}
                        className="flex flex-col gap-3 py-1"
                    >
                        <div className="flex flex-col gap-1.5">
                            <div className="h-3.5 w-full rounded bg-slate-800 animate-pulse" />
                            <div className="h-3.5 w-4/5 rounded bg-slate-800 animate-pulse" />
                        </div>
                        {Array.from({ length: 2 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="rounded border border-slate-800 bg-slate-800/50 p-3 flex flex-col gap-2"
                            >
                                <div className="h-3.5 w-32 rounded bg-slate-700/80 animate-pulse" />
                                <div className="h-3 w-full rounded bg-slate-700/60 animate-pulse" />
                                <div className="h-7 w-24 rounded bg-slate-700/60 animate-pulse mt-1" />
                            </div>
                        ))}
                        <span className="sr-only">{t("director.computingAria")}</span>
                    </div>
                ) : advice ? (
                    <>
                        {advice.summary && (
                            <p className="text-slate-200 leading-relaxed">{advice.summary}</p>
                        )}
                        {advice.cause && (
                            <div className="rounded bg-slate-800/80 border border-slate-700 px-2.5 py-2 text-[11px] text-slate-300">
                                <span className="font-mono font-bold uppercase text-slate-400 block text-[10px] mb-0.5">
                                    {t("director.rootCause")}
                                </span>
                                {advice.cause}
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                {t("director.rankedOptions")}
                            </span>
                            {(advice.options ?? []).map((opt, idx) => {
                                const isRecommended = advice.recommendedIndex === idx;
                                return (
                                    <div
                                        key={idx}
                                        className={`rounded border p-2.5 flex flex-col gap-1.5 ${
                                            isRecommended
                                                ? "border-emerald-500/60 bg-emerald-950/30"
                                                : "border-slate-700 bg-slate-800/60"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-mono text-[11px] font-bold text-white">
                                                {opt.label ||
                                                    opt.kind ||
                                                    t("director.optionFallback", {
                                                        index: idx + 1,
                                                    })}
                                            </span>
                                            {isRecommended && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {t("director.recBadge")}
                                                </span>
                                            )}
                                        </div>
                                        {opt.rationale && (
                                            <p className="text-[11px] text-slate-300 leading-snug">
                                                {opt.rationale}
                                            </p>
                                        )}
                                        {opt.sideEffects && (
                                            <p className="text-[10px] text-amber-300/90">
                                                {t("director.tradeOff", { text: opt.sideEffects })}
                                            </p>
                                        )}
                                        <div className="flex justify-end pt-1">
                                            <button
                                                type="button"
                                                disabled={simulateMutation.isPending}
                                                onClick={() => simulateMutation.mutate(opt)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[10px] font-mono font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                {simulateMutation.isPending ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Eye className="w-3 h-3" />
                                                )}
                                                <span>{t("director.preview4d")}</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="py-5 flex flex-col items-center gap-2.5 text-center text-slate-400 font-mono">
                        <span>{t("director.emptyError")}</span>
                        <button
                            type="button"
                            onClick={() => adviseMutation.mutate()}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 cursor-pointer"
                        >
                            <RefreshCw className="w-3 h-3" />
                            <span>{tCommon("retry")}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
