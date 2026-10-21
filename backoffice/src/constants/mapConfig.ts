export const MAP_CONFIG = {
    DEFAULT_CENTER: {
        lat: 21.028511,
        lon: 105.854444,
        height: 12000,
    },
    DEFAULT_ZOOM_2D: 13,
    TILE_PROVIDERS: {
        ESRI_IMAGERY:
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        ESRI_STREET:
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
    },
} as const;
