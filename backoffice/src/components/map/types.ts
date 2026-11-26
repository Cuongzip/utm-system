import type { Viewer } from "cesium";

export type MapMode = "2d" | "3d";

export type ImageryType = "satellite-hybrid" | "satellite" | "tactical-dark" | "carto" | "street";

export interface CesiumContextValue {
    viewer: Viewer | null;
    isLoaded: boolean;
    hasIonToken: boolean;
}
