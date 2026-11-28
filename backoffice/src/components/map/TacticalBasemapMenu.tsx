"use client";

import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import { Check, Layers } from "lucide-react";
import { cn } from "@/lib";
import type { ImageryType } from "./types";
import { BASEMAP_OPTIONS } from "./useTacticalMapSettings";

interface TacticalBasemapMenuProps {
    containerRef: RefObject<HTMLDivElement | null>;
    isOpen: boolean;
    onToggleOpen: () => void;
    onClose: () => void;
    imageryType: ImageryType;
    onSelectLayer: (layer: ImageryType) => void;
    mapMode: "globe" | "2d";
    hasIonToken: boolean;
    enable3DBuildings: boolean;
    enable3DTerrain: boolean;
    onToggle3DSetting: (storageKey: string, eventName: string, nextValue: boolean) => void;
}

export function TacticalBasemapMenu({
    containerRef,
    isOpen,
    onToggleOpen,
    onClose,
    imageryType,
    onSelectLayer,
    mapMode,
    hasIonToken,
    enable3DBuildings,
    enable3DTerrain,
    onToggle3DSetting,
}: TacticalBasemapMenuProps) {
    const t = useTranslations("map");

    return (
        <div className="relative pointer-events-auto" ref={containerRef}>
            <button
                type="button"
                onClick={onToggleOpen}
                aria-label={t("basemapLayers")}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={`h-8 w-8 inline-flex items-center justify-center rounded-md border text-xs font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 shadow-sm cursor-pointer ${
                    isOpen
                        ? "bg-slate-800 border-cyan-500/50 text-cyan-200"
                        : "bg-slate-950/88 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md"
                }`}
                title={t("basemapLayers")}
            >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    aria-label={t("basemapOptionsAria")}
                    className="absolute right-0 top-full mt-1.5 w-52 rounded-md border border-slate-700/85 bg-slate-950/95 p-1 text-slate-200 shadow-xl backdrop-blur-md z-50 text-xs font-mono"
                >
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-0.5">
                        {t("basemap")}
                    </div>
                    {BASEMAP_OPTIONS.map((layer) => {
                        const isSelected = imageryType === layer.id;
                        return (
                            <button
                                key={layer.id}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isSelected}
                                onClick={() => {
                                    onSelectLayer(layer.id);
                                    onClose();
                                }}
                                className={`w-full text-left rounded-[4px] py-1.5 px-2 flex items-center justify-between gap-2 transition-colors focus-visible:bg-slate-800 focus-visible:text-white focus-visible:outline-none cursor-pointer ${
                                    isSelected
                                        ? "bg-slate-800 text-white font-semibold"
                                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                                }`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    <span
                                        aria-hidden="true"
                                        className={cn(
                                            "h-3.5 w-3.5 rounded-[3px] shrink-0",
                                            layer.swatchClass
                                        )}
                                    />
                                    <span className="truncate">{t(`basemaps.${layer.id}`)}</span>
                                </span>
                                {isSelected && (
                                    <Check
                                        className="h-3.5 w-3.5 text-cyan-400 stroke-[2.5] shrink-0"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        );
                    })}

                    {mapMode === "globe" && hasIonToken && (
                        <div className="mt-1 pt-1 border-t border-slate-800">
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {t("env3d")}
                            </div>
                            <button
                                type="button"
                                role="menuitemcheckbox"
                                aria-checked={enable3DBuildings}
                                onClick={() =>
                                    onToggle3DSetting(
                                        "utm_map_3d_buildings",
                                        "utm_map_3d_buildings_change",
                                        !enable3DBuildings
                                    )
                                }
                                className={`relative w-full text-left rounded-[4px] py-1.5 pl-7 pr-2.5 flex items-center justify-between transition-colors focus-visible:bg-slate-800 focus-visible:text-white focus-visible:outline-none cursor-pointer ${
                                    enable3DBuildings
                                        ? "text-white font-semibold hover:bg-slate-800"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                    {enable3DBuildings && (
                                        <Check
                                            className="h-3.5 w-3.5 text-cyan-400 stroke-[2.5]"
                                            aria-hidden="true"
                                        />
                                    )}
                                </span>
                                <span>{t("osmBuildings")}</span>
                            </button>
                            <button
                                type="button"
                                role="menuitemcheckbox"
                                aria-checked={enable3DTerrain}
                                onClick={() =>
                                    onToggle3DSetting(
                                        "utm_map_3d_terrain",
                                        "utm_map_3d_terrain_change",
                                        !enable3DTerrain
                                    )
                                }
                                className={`relative w-full text-left rounded-[4px] py-1.5 pl-7 pr-2.5 flex items-center justify-between transition-colors focus-visible:bg-slate-800 focus-visible:text-white focus-visible:outline-none cursor-pointer ${
                                    enable3DTerrain
                                        ? "text-white font-semibold hover:bg-slate-800"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                                    {enable3DTerrain && (
                                        <Check
                                            className="h-3.5 w-3.5 text-cyan-400 stroke-[2.5]"
                                            aria-hidden="true"
                                        />
                                    )}
                                </span>
                                <span>{t("worldTerrain")}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
