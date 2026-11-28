"use client";

import { useTranslations } from "next-intl";
import { Crosshair, X } from "lucide-react";
import { CustomSelect, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import type { GotoDraftTarget } from "../FlightDeckMapOverlay";
import type { VectorPopoverType } from "./useCockpitCommands";

interface CockpitVectorPopoverProps {
    activePopover: Exclude<VectorPopoverType, null>;
    altitudeInput: string;
    onChangeAltitudeInput: (val: string) => void;
    onAdjustAltitudeBy: (delta: number) => void;
    onApplyAltitude: () => void;
    speedInput: string;
    onChangeSpeedInput: (val: string) => void;
    speedPreviewKmh: number | null;
    onApplySpeed: () => void;
    gotoDraft: GotoDraftTarget | null;
    gotoPickMode: boolean;
    onToggleGotoPickMode: (next: boolean) => void;
    gotoAltInput: string;
    onChangeGotoAltInput: (raw: string) => void;
    onDispatchGoto: () => void;
    divertHubId: string;
    onChangeDivertHubId: (val: string) => void;
    alternateHubOptions: SelectOption[];
    divertReason: string;
    onChangeDivertReason: (val: string) => void;
    onRequestDivert: () => void;
    isSubmitting: boolean;
    onClose: () => void;
}

export function CockpitVectorPopover({
    activePopover,
    altitudeInput,
    onChangeAltitudeInput,
    onAdjustAltitudeBy,
    onApplyAltitude,
    speedInput,
    onChangeSpeedInput,
    speedPreviewKmh,
    onApplySpeed,
    gotoDraft,
    gotoPickMode,
    onToggleGotoPickMode,
    gotoAltInput,
    onChangeGotoAltInput,
    onDispatchGoto,
    divertHubId,
    onChangeDivertHubId,
    alternateHubOptions,
    divertReason,
    onChangeDivertReason,
    onRequestDivert,
    isSubmitting,
    onClose,
}: CockpitVectorPopoverProps) {
    const t = useTranslations("flights.deck");
    const tc = useTranslations("common");

    return (
        <div className="w-[calc(100vw-1.5rem)] sm:w-96 rounded-md border border-slate-700/90 bg-slate-900/95 p-3 text-slate-100 shadow-2xl backdrop-blur-md text-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-200">
                    {activePopover === "alt"
                        ? t("targetAltitudeM")
                        : activePopover === "speed"
                          ? t("targetSpeedMs")
                          : activePopover === "goto"
                            ? t("tacticalGotoTitle")
                            : t("divertHubTitle")}
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label={tc("close")}
                    className="w-6 h-6 rounded hover:bg-slate-800 inline-flex items-center justify-center text-slate-400 hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
            </div>

            {activePopover === "alt" && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        {[-20, -10, 10, 20].map((step) => (
                            <button
                                key={step}
                                type="button"
                                onClick={() => onAdjustAltitudeBy(step)}
                                className="flex-1 h-7 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 font-mono text-[11px] font-semibold text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                {step > 0 ? `+${step}` : step}m
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            inputMode="decimal"
                            aria-label={t("targetAltitudeM")}
                            value={altitudeInput}
                            onChange={(e) => onChangeAltitudeInput(e.target.value)}
                            className="flex-1 h-8 px-2.5 rounded border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:border-slate-500"
                        />
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onApplyAltitude}
                            className="chamfer-xs h-8 px-3 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {t("applyAlt")}
                        </button>
                    </div>
                </div>
            )}

            {activePopover === "speed" && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                        {[8, 15, 22].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => onChangeSpeedInput(String(preset))}
                                className="flex-1 h-7 rounded border border-slate-700 bg-slate-800 hover:bg-slate-700 font-mono text-[11px] font-semibold text-slate-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                {preset} m/s
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                inputMode="decimal"
                                aria-label={t("targetSpeedMs")}
                                value={speedInput}
                                onChange={(e) => onChangeSpeedInput(e.target.value)}
                                className="w-full h-8 pl-2.5 pr-16 rounded border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:border-slate-500"
                            />
                            {speedPreviewKmh != null && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                                    {speedPreviewKmh} km/h
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onApplySpeed}
                            className="chamfer-xs h-8 px-3 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {t("applySpeed")}
                        </button>
                    </div>
                </div>
            )}

            {activePopover === "goto" && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                            {gotoDraft
                                ? `${gotoDraft.latitude.toFixed(5)}, ${gotoDraft.longitude.toFixed(5)}`
                                : t("gotoHint")}
                        </span>
                        <button
                            type="button"
                            onClick={() => onToggleGotoPickMode(!gotoPickMode)}
                            className={cn(
                                "px-2 py-1 rounded text-[10px] font-mono font-bold inline-flex items-center gap-1 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                gotoPickMode
                                    ? "bg-amber-500 text-slate-950"
                                    : "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                            )}
                        >
                            <Crosshair className="w-3 h-3" aria-hidden="true" />
                            <span>{gotoPickMode ? t("pickingOnMap") : t("pickOnMap")}</span>
                        </button>
                    </div>

                    {gotoDraft && (
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="text"
                                inputMode="decimal"
                                value={gotoAltInput}
                                onChange={(e) => onChangeGotoAltInput(e.target.value)}
                                aria-label={t("targetAltitudeM")}
                                className="w-24 h-8 px-2 rounded border border-slate-700 bg-slate-800 text-white font-mono text-xs focus:outline-none focus:border-slate-500"
                            />
                            <span className="text-[11px] font-mono text-slate-400">m AGL</span>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={onDispatchGoto}
                                className="chamfer-xs h-8 px-3 ml-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                            >
                                {t("flyToPoint")}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activePopover === "divert" && (
                <div className="space-y-2">
                    <div className="text-slate-900">
                        <CustomSelect
                            value={divertHubId}
                            onValueChange={onChangeDivertHubId}
                            options={alternateHubOptions}
                        />
                    </div>
                    {divertHubId && (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={divertReason}
                                onChange={(e) => onChangeDivertReason(e.target.value)}
                                placeholder={t("divertReasonPlaceholder")}
                                className="flex-1 h-8 px-2.5 rounded border border-slate-700 bg-slate-800 text-white text-xs focus:outline-none focus:border-slate-500"
                            />
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={onRequestDivert}
                                className="chamfer-xs h-8 px-3 bg-white hover:bg-slate-200 text-slate-950 font-mono text-[11px] font-bold uppercase cursor-pointer shrink-0 disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                            >
                                {t("divertBtn")}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
