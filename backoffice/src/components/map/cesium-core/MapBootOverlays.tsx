"use client";

import { useTranslations } from "next-intl";

interface MapBootOverlaysProps {
    isLoaded: boolean;
    mapError: string | null;
    onRetry: () => void;
}

export function MapBootOverlays({ isLoaded, mapError, onRetry }: MapBootOverlaysProps) {
    const t = useTranslations("map");

    return (
        <>
            {!isLoaded && !mapError && (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label={t("loadingMap")}
                    className="absolute inset-0 z-30 bg-slate-900/95 p-4 flex flex-col justify-between overflow-hidden"
                >
                    <div className="flex items-center justify-between">
                        <div className="h-7 w-20 rounded bg-slate-800 animate-pulse" />
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-24 rounded bg-slate-800 animate-pulse" />
                            <div className="h-7 w-7 rounded bg-slate-800 animate-pulse" />
                        </div>
                    </div>
                    <div className="flex-1 my-4 rounded border border-slate-800/80 bg-slate-800/40 animate-pulse" />
                    <div className="flex items-center justify-between">
                        <div className="h-5 w-32 rounded bg-slate-800 animate-pulse" />
                        <div className="h-5 w-24 rounded bg-slate-800 animate-pulse" />
                    </div>
                    <span className="sr-only">{t("loadingMap")}</span>
                </div>
            )}

            {mapError && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-slate-950/92 px-4 text-center">
                    <span className="text-sm font-mono font-semibold text-red-400">{mapError}</span>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="h-8 px-3 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                    >
                        {t("retryMap")}
                    </button>
                </div>
            )}
        </>
    );
}
