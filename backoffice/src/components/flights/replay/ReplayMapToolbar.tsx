"use client";

import { useTranslations } from "next-intl";
import { Maximize, Radio } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { cn } from "@/lib";

interface ReplayMapToolbarProps {
    followUav: boolean;
    onToggleFollowUav: () => void;
    onFitRoute: () => void;
    filterAirspace: boolean;
    onToggleAirspace: () => void;
    filterHubs: boolean;
    onToggleHubs: () => void;
    filterAdsb: boolean;
    onToggleAdsb: () => void;
}

export function ReplayMapToolbar({
    followUav,
    onToggleFollowUav,
    onFitRoute,
    filterAirspace,
    onToggleAirspace,
    filterHubs,
    onToggleHubs,
    filterAdsb,
    onToggleAdsb,
}: ReplayMapToolbarProps) {
    const td = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");

    return (
        <div className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white z-10">
            <div className="flex items-center gap-2">
                <StatusBadge status="standby" label={td("replayBadge")} />
                <button
                    type="button"
                    aria-pressed={followUav}
                    onClick={onToggleFollowUav}
                    className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        followUav
                            ? "bg-slate-800 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    )}
                >
                    <Radio className="w-3 h-3" />
                    <span>{td("followUav")}</span>
                </button>
                <button
                    type="button"
                    onClick={onFitRoute}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono font-semibold text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                    <Maximize className="w-3 h-3" />
                    <span>{td("fitRoute")}</span>
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    aria-pressed={filterAirspace}
                    onClick={onToggleAirspace}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        filterAirspace
                            ? "bg-slate-800 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            "w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0",
                            !filterAirspace && "opacity-45"
                        )}
                    />
                    <span>{tCtrl("layerAirspace")}</span>
                </button>
                <button
                    type="button"
                    aria-pressed={filterHubs}
                    onClick={onToggleHubs}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        filterHubs
                            ? "bg-slate-800 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            "w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0",
                            !filterHubs && "opacity-45"
                        )}
                    />
                    <span>{tCtrl("layerHubs")}</span>
                </button>
                <button
                    type="button"
                    aria-pressed={filterAdsb}
                    onClick={onToggleAdsb}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                        filterAdsb
                            ? "bg-slate-800 text-white"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    )}
                >
                    <span
                        aria-hidden="true"
                        className={cn(
                            "w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0",
                            !filterAdsb && "opacity-45"
                        )}
                    />
                    <span>{tCtrl("layerAdsb")}</span>
                </button>
            </div>
        </div>
    );
}
