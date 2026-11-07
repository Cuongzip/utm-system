let cesiumPromise: Promise<typeof import("cesium")> | null = null;

export function getCesium() {
    if (!cesiumPromise) {
        cesiumPromise = import("cesium");
    }
    return cesiumPromise;
}
