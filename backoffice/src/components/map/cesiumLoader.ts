let cesiumPromise: Promise<typeof import("cesium")> | null = null;

export function getCesium(): Promise<typeof import("cesium")> {
    if (!cesiumPromise) {
        cesiumPromise = import("cesium");
    }
    return cesiumPromise;
}
