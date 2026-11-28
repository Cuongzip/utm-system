let cesiumPromise: Promise<typeof import("cesium")> | null = null;
let loadedCesium: typeof import("cesium") | null = null;

export function getCesium(): Promise<typeof import("cesium")> {
    if (!cesiumPromise) {
        cesiumPromise = import("cesium").then((mod) => {
            loadedCesium = mod;
            return mod;
        });
    }
    return cesiumPromise;
}

export function getLoadedCesium(): typeof import("cesium") | null {
    return loadedCesium;
}
