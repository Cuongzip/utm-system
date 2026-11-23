import type { Viewer } from "cesium";

export type MapMode = "2d" | "3d";

export type ImageryType = "street" | "satellite" | "carto";

export interface CesiumContextValue {
    viewer: Viewer | null;
    isLoaded: boolean;
}
