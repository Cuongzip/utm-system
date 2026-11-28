"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ImageryType } from "./types";

const VALID_IMAGERY_TYPES: readonly ImageryType[] = [
    "satellite-hybrid",
    "satellite",
    "tactical-dark",
    "carto",
    "street",
];

export const BASEMAP_OPTIONS: ReadonlyArray<{
    id: ImageryType;
    swatchClass: string;
}> = [
    {
        id: "satellite-hybrid",
        swatchClass:
            "bg-gradient-to-br from-emerald-950 via-slate-800 to-amber-900/70 ring-1 ring-amber-300/40",
    },
    {
        id: "satellite",
        swatchClass:
            "bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 ring-1 ring-emerald-400/30",
    },
    {
        id: "tactical-dark",
        swatchClass:
            "bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 ring-1 ring-cyan-500/35",
    },
    {
        id: "carto",
        swatchClass:
            "bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 ring-1 ring-slate-400/50",
    },
    {
        id: "street",
        swatchClass:
            "bg-gradient-to-br from-amber-50 via-emerald-100 to-sky-200 ring-1 ring-sky-400/50",
    },
];

function subscribeStorageEvent(eventName: string, callback: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener(eventName, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener(eventName, callback);
    };
}

export const subscribeMapMode = (cb: () => void) =>
    subscribeStorageEvent("utm_map_mode_change", cb);
export const subscribeMapLayer = (cb: () => void) =>
    subscribeStorageEvent("utm_map_layer_change", cb);
const subscribe3DBuildings = (cb: () => void) =>
    subscribeStorageEvent("utm_map_3d_buildings_change", cb);
const subscribe3DTerrain = (cb: () => void) =>
    subscribeStorageEvent("utm_map_3d_terrain_change", cb);
export const getServerMapModeSnapshot = (): "globe" | "2d" => "2d";
const get3DBuildingsSnapshot = () => getBooleanSettingSnapshot("utm_map_3d_buildings", true);
const get3DTerrainSnapshot = () => getBooleanSettingSnapshot("utm_map_3d_terrain", true);
const getTrueSnapshot = () => true;

export function getMapModeSnapshot(): "globe" | "2d" {
    if (typeof window === "undefined") return "2d";
    try {
        const saved = localStorage.getItem("utm_map_mode");
        if (saved === "2d" || saved === "globe") return saved;
    } catch {
        // ignore
    }
    return "2d";
}

export function getMapLayerSnapshot(fallback: ImageryType): ImageryType {
    if (typeof window === "undefined") return fallback;
    try {
        const saved = localStorage.getItem("utm_map_layer");
        if (saved && (VALID_IMAGERY_TYPES as readonly string[]).includes(saved)) {
            return saved as ImageryType;
        }
    } catch {
        // ignore
    }
    return fallback;
}

function getBooleanSettingSnapshot(key: string, fallback: boolean): boolean {
    if (typeof window === "undefined") return fallback;
    try {
        const saved = localStorage.getItem(key);
        if (saved === "true") return true;
        if (saved === "false") return false;
    } catch {
        // ignore
    }
    return fallback;
}

export function useTacticalMapSettings(initialLayerType: ImageryType) {
    const mapMode = useSyncExternalStore(
        subscribeMapMode,
        getMapModeSnapshot,
        getServerMapModeSnapshot
    );
    const imageryType = useSyncExternalStore(
        subscribeMapLayer,
        () => getMapLayerSnapshot(initialLayerType),
        () => initialLayerType
    );
    const enable3DBuildings = useSyncExternalStore(
        subscribe3DBuildings,
        get3DBuildingsSnapshot,
        getTrueSnapshot
    );
    const enable3DTerrain = useSyncExternalStore(
        subscribe3DTerrain,
        get3DTerrainSnapshot,
        getTrueSnapshot
    );

    const handleModeChange = useCallback((newMode: "globe" | "2d") => {
        try {
            localStorage.setItem("utm_map_mode", newMode);
            window.dispatchEvent(new Event("utm_map_mode_change"));
        } catch {
            // ignore
        }
    }, []);

    const handleLayerChange = useCallback((newLayer: ImageryType) => {
        try {
            localStorage.setItem("utm_map_layer", newLayer);
            window.dispatchEvent(new Event("utm_map_layer_change"));
        } catch {
            // ignore
        }
    }, []);

    const handleToggle3DSetting = useCallback(
        (storageKey: string, eventName: string, nextValue: boolean) => {
            try {
                localStorage.setItem(storageKey, String(nextValue));
                window.dispatchEvent(new Event(eventName));
            } catch {
                // ignore
            }
        },
        []
    );

    return {
        mapMode,
        imageryType,
        enable3DBuildings,
        enable3DTerrain,
        handleModeChange,
        handleLayerChange,
        handleToggle3DSetting,
    };
}
