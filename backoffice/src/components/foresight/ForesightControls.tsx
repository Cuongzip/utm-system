"use client";

import { useTranslations } from "next-intl";
import { Play, Pause, RefreshCw, AlertTriangle, X } from "lucide-react";
import type { ForesightPrediction, ForesightPredictedConflict } from "@/types";

interface ForesightControlsProps {
    prediction: ForesightPrediction | null;
    simulatedPrediction: ForesightPrediction | null;
    loading: boolean;
    horizonSec: number;
    onHorizonChange: (horizon: number) => void;
    frameIndex: number;
    onFrameIndexChange: (idx: number) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onRefresh: () => void;
    selectedConflict: ForesightPredictedConflict | null;
    onSelectConflict: (conflict: ForesightPredictedConflict | null) => void;
    onClearSimulation: () => void;
    onClose: () => void;
}

export function ForesightControls({
    prediction,
    simulatedPrediction,
    loading,
    horizonSec,
    onHorizonChange,
    frameIndex,
    onFrameIndexChange,
    isPlaying,
    onTogglePlay,
    onRefresh,
    selectedConflict,
    onSelectConflict,
    onClearSimulation,
    onClose,
}: ForesightControlsProps) {
    const t = useTranslations("foresight");
    const activeData = simulatedPrediction ?? prediction;
    const frames = activeData?.frames ?? [];
    const maxIndex = Math.max(frames.length - 1, 0);
    const safeIndex = Math.min(frameIndex, maxIndex);
    const currentOffset = frames[safeIndex]?.tOffsetSec ?? 0;
    const conflicts = activeData?.predictedConflicts ?? [];

    return (
        <div className="absolute bottom-4 left-4 right-4 sm:right-36 lg:max-w-[580px] z-30 chamfer-sm bg-slate-900/94 border border-slate-700/80 backdrop-blur-md shadow-xl p-3 text-slate-100 flex flex-col gap-2.5 pointer-events-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white">
                        {t("title")}
                    </span>
                    {simulatedPrediction ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                            {t("previewBadge", { count: conflicts.length })}
                        </span>
                    ) : (
                        <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                conflicts.length > 0
                                    ? "bg-red-500/20 border border-red-500/40 text-red-300"
                                    : "bg-slate-800 border border-slate-700 text-slate-300"
                            }`}
                        >
                            {loading
                                ? t("predicting")
                                : t("predictedCount", { count: conflicts.length })}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <div className="flex items-center rounded bg-slate-800 p-0.5 border border-slate-700 text-[10px] font-mono">
                        {[180, 300, 600].map((h) => (
                            <button
                                key={h}
                                type="button"
                                aria-pressed={horizonSec === h}
                                onClick={() => onHorizonChange(h)}
                                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 ${
                                    horizonSec === h
                                        ? "bg-slate-600 text-white font-bold"
                                        : "text-slate-400 hover:text-white"
                                }`}
                            >
                                {t("horizonMin", { min: h / 60 })}
                            </button>
                        ))}
                    </div>

                    {simulatedPrediction && (
                        <button
                            type="button"
                            onClick={onClearSimulation}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[10px] font-mono font-semibold text-slate-200 cursor-pointer"
                        >
                            {t("exitPreview")}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={loading}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                        title={t("refreshPrediction")}
                        aria-label={t("refreshPrediction")}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title={t("closeForesight")}
                        aria-label={t("closeForesight")}
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2.5">
                <button
                    type="button"
                    onClick={onTogglePlay}
                    disabled={maxIndex === 0}
                    aria-label={isPlaying ? t("pauseTimeline") : t("playTimeline")}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-white shrink-0 cursor-pointer disabled:opacity-40"
                >
                    {isPlaying ? (
                        <Pause className="w-3.5 h-3.5" />
                    ) : (
                        <Play className="w-3.5 h-3.5" />
                    )}
                </button>
                <input
                    type="range"
                    min={0}
                    max={maxIndex}
                    value={safeIndex}
                    onChange={(e) => onFrameIndexChange(Number(e.target.value))}
                    aria-label={t("timelineAria")}
                    className="flex-1 accent-slate-300 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-slate-200 w-14 text-right tabular-nums shrink-0">
                    T+{currentOffset}s
                </span>
            </div>

            {conflicts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800">
                    {conflicts.map((conflict, idx) => {
                        const isSelected = Boolean(
                            conflict.id && selectedConflict?.id === conflict.id
                        );
                        return (
                            <button
                                key={conflict.id ?? idx}
                                type="button"
                                onClick={() => onSelectConflict(isSelected ? null : conflict)}
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                                    isSelected
                                        ? "bg-red-600 text-white font-bold"
                                        : "bg-red-950/70 border border-red-700/60 text-red-200 hover:bg-red-900/80"
                                }`}
                            >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>
                                    {conflict.primary?.label || "UAV-1"} ×{" "}
                                    {conflict.secondary?.label || "UAV-2"} · T+
                                    {Math.round(conflict.timeToConflictSec ?? 0)}s (
                                    {Math.round(conflict.minSeparationM ?? 0)}m)
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
