import type * as CesiumType from "cesium";
import type { ImageryType } from "./types";

export interface ConfiguredImageryLayer {
    provider: CesiumType.ImageryProvider;
    alpha?: number;
    brightness?: number;
    contrast?: number;
    saturation?: number;
    gamma?: number;
}

const ARCGIS_WORLD_IMAGERY_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";
const ARCGIS_WORLD_STREET_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer";
const ARCGIS_TRANSPORT_REF_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer";
const ARCGIS_PLACES_REF_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer";
const ARCGIS_DARK_GRAY_BASE_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer";
const ARCGIS_DARK_GRAY_REF_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer";
const ARCGIS_LIGHT_GRAY_BASE_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer";
const ARCGIS_LIGHT_GRAY_REF_URL =
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer";

export async function createImageryLayersForType(
    Cesium: typeof CesiumType,
    layerType: ImageryType
): Promise<ConfiguredImageryLayer[]> {
    if (layerType === "tactical-dark") {
        const [darkBase, darkRefResult] = await Promise.all([
            Cesium.ArcGisMapServerImageryProvider.fromUrl(ARCGIS_DARK_GRAY_BASE_URL, {
                enablePickFeatures: false,
            }),
            Cesium.ArcGisMapServerImageryProvider.fromUrl(ARCGIS_DARK_GRAY_REF_URL, {
                enablePickFeatures: false,
            }).then(
                (provider) => ({ ok: true as const, provider }),
                () => ({ ok: false as const })
            ),
        ]);

        const layers: ConfiguredImageryLayer[] = [
            {
                provider: darkBase,
                contrast: 1.12,
                brightness: 0.96,
            },
        ];
        if (darkRefResult.ok) {
            layers.push({
                provider: darkRefResult.provider,
                alpha: 0.92,
                contrast: 1.1,
            });
        }
        return layers;
    }

    if (layerType === "carto") {
        const [lightBase, lightRefResult] = await Promise.all([
            Cesium.ArcGisMapServerImageryProvider.fromUrl(ARCGIS_LIGHT_GRAY_BASE_URL, {
                enablePickFeatures: false,
            }),
            Cesium.ArcGisMapServerImageryProvider.fromUrl(ARCGIS_LIGHT_GRAY_REF_URL, {
                enablePickFeatures: false,
            }).then(
                (provider) => ({ ok: true as const, provider }),
                () => ({ ok: false as const })
            ),
        ]);

        const layers: ConfiguredImageryLayer[] = [
            {
                provider: lightBase,
                contrast: 1.04,
            },
        ];
        if (lightRefResult.ok) {
            layers.push({
                provider: lightRefResult.provider,
                alpha: 0.92,
            });
        }
        return layers;
    }

    if (layerType === "street") {
        const streetProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            ARCGIS_WORLD_STREET_URL,
            { enablePickFeatures: false }
        );
        return [{ provider: streetProvider }];
    }

    const satelliteBase = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
        ARCGIS_WORLD_IMAGERY_URL,
        { enablePickFeatures: false }
    );

    const layers: ConfiguredImageryLayer[] = [
        {
            provider: satelliteBase,
            contrast: 1.06,
            saturation: 0.95,
            gamma: 0.98,
        },
    ];

    if (layerType === "satellite-hybrid") {
        const [roadsResult, placesResult] = await Promise.allSettled([
            Cesium.ArcGisMapServerImageryProvider.fromUrl(ARCGIS_TRANSPORT_REF_URL, {
                enablePickFeatures: false,
            }),
            Cesium.ArcGisMapServerImageryProvider.fromUrl(ARCGIS_PLACES_REF_URL, {
                enablePickFeatures: false,
            }),
        ]);

        if (roadsResult.status === "fulfilled") {
            layers.push({
                provider: roadsResult.value,
                alpha: 0.72,
            });
        }
        if (placesResult.status === "fulfilled") {
            layers.push({
                provider: placesResult.value,
                alpha: 0.9,
            });
        }
    }

    return layers;
}

export function applyConfiguredImageryLayers(
    viewer: CesiumType.Viewer,
    layers: ConfiguredImageryLayer[]
): void {
    if (viewer.isDestroyed()) return;
    viewer.imageryLayers.removeAll();
    for (const cfg of layers) {
        const added = viewer.imageryLayers.addImageryProvider(cfg.provider);
        if (cfg.alpha !== undefined) added.alpha = cfg.alpha;
        if (cfg.brightness !== undefined) added.brightness = cfg.brightness;
        if (cfg.contrast !== undefined) added.contrast = cfg.contrast;
        if (cfg.saturation !== undefined) added.saturation = cfg.saturation;
        if (cfg.gamma !== undefined) added.gamma = cfg.gamma;
    }
}
