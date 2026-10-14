"use client";

import { useEffect, useRef, useState } from "react";
import type { Viewer, Cesium3DTileset, ImageryLayer } from "cesium";
import { Mountain, Building2, Globe, Compass } from "lucide-react";
import { CompassLoader } from "@/components/CompassLoader";
import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

interface CesiumMapProps {
  height?: string;
}

export default function CesiumMap({ height = "650px" }: CesiumMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layerType, setLayerType] = useState<"satellite" | "ion" | "street" | "carto">("satellite");
  const [viewMode, setViewMode] = useState<"3d" | "2.5d" | "2d">("3d");
  const [showTerrain, setShowTerrain] = useState(false);
  const [showBuildings, setShowBuildings] = useState(false);
  const [hasIonToken, setHasIonToken] = useState(false);

  const viewerRef = useRef<Viewer | null>(null);
  const buildingsTilesetRef = useRef<Cesium3DTileset | null>(null);

  useEffect(() => {
    let viewer: Viewer | null = null;

    async function initCesium() {
      if (!containerRef.current) return;

      try {
        window.CESIUM_BASE_URL = "/cesium";
        const Cesium = await import("cesium");

        const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";
        Cesium.Ion.defaultAccessToken = ionToken;
        if (ionToken) {
          setHasIonToken(true);
        }

        let baseLayer: ImageryLayer | undefined;
        try {
          const esriProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
            { enablePickFeatures: false }
          );
          baseLayer = new Cesium.ImageryLayer(esriProvider);
        } catch {
          const fallbackProvider = await Cesium.TileMapServiceImageryProvider.fromUrl(
            Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII")
          );
          baseLayer = new Cesium.ImageryLayer(fallbackProvider);
        }

        const viewerOptions: Viewer.ConstructorOptions = {
          baseLayer,
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          creditContainer: document.createElement("div"),
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          animation: false,
          timeline: false,
          fullscreenButton: true,
          homeButton: true,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          infoBox: false,
          geocoder: false,
          selectionIndicator: false,
        };

        viewer = new Cesium.Viewer(containerRef.current, viewerOptions);
        viewerRef.current = viewer;

        viewer.useBrowserRecommendedResolution = false;
        viewer.resolutionScale = 1.0;
        viewer.scene.globe.depthTestAgainstTerrain = false;

        if (ionToken) {
          try {
            const buildings = await Cesium.createOsmBuildingsAsync();
            buildings.show = false;
            viewer.scene.primitives.add(buildings);
            buildingsTilesetRef.current = buildings;
          } catch (bErr) {
            console.warn("Không thể tải OSM 3D Buildings:", bErr);
          }
        }

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(108.2772, 14.0583, 7000000.0),
        });

        setIsLoaded(true);
      } catch (err: unknown) {
        console.error("Failed to initialize Cesium:", err);
        const errorMessage = err instanceof Error ? err.message : "Khởi tạo Cesium globe thất bại";
        setError(errorMessage);
      }
    }

    initCesium();

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, []);

  const switchLayer = async (type: "satellite" | "ion" | "street" | "carto") => {
    if (!viewerRef.current) return;
    const Cesium = await import("cesium");
    const viewer = viewerRef.current;
    viewer.imageryLayers.removeAll();

    if (type === "satellite") {
      const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        { enablePickFeatures: false }
      );
      viewer.imageryLayers.addImageryProvider(provider);
    } else if (type === "ion") {
      try {
        const provider = await Cesium.createWorldImageryAsync();
        viewer.imageryLayers.addImageryProvider(provider);
      } catch (err) {
        console.warn("Không thể tải Ion World Imagery:", err);
      }
    } else if (type === "street") {
      const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
        { enablePickFeatures: false }
      );
      viewer.imageryLayers.addImageryProvider(provider);
    } else if (type === "carto") {
      const provider = new Cesium.UrlTemplateImageryProvider({
        url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c", "d"],
      });
      viewer.imageryLayers.addImageryProvider(provider);
    }
    setLayerType(type);
    viewer.scene.requestRender();
  };

  const switchMode = (mode: "3d" | "2.5d" | "2d") => {
    if (!viewerRef.current) return;
    const viewer = viewerRef.current;
    if (mode === "3d") {
      viewer.scene.morphTo3D(1.0);
    } else if (mode === "2.5d") {
      viewer.scene.morphToColumbusView(1.0);
    } else if (mode === "2d") {
      viewer.scene.morphTo2D(1.0);
    }
    setViewMode(mode);
  };

  const toggleTerrain = async () => {
    if (!viewerRef.current) return;
    const Cesium = await import("cesium");
    const viewer = viewerRef.current;

    const nextState = !showTerrain;
    if (nextState) {
      try {
        const terrain = await Cesium.Terrain.fromWorldTerrain();
        viewer.scene.setTerrain(terrain);
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.verticalExaggeration = 2.0;
      } catch (err) {
        console.warn("Lỗi khi tải World Terrain:", err);
      }
    } else {
      viewer.scene.setTerrain(new Cesium.Terrain(Promise.resolve(new Cesium.EllipsoidTerrainProvider())));
      viewer.scene.globe.depthTestAgainstTerrain = false;
      viewer.scene.verticalExaggeration = 1.0;
    }
    setShowTerrain(nextState);
    viewer.scene.requestRender();
  };

  const toggleBuildings = () => {
    if (!buildingsTilesetRef.current || !viewerRef.current) return;
    const nextState = !showBuildings;
    buildingsTilesetRef.current.show = nextState;
    setShowBuildings(nextState);
    viewerRef.current.scene.requestRender();
  };

  const flyToPreset = async (preset: "fansipan" | "landmark81" | "fuji" | "overview") => {
    if (!viewerRef.current) return;
    const Cesium = await import("cesium");
    const viewer = viewerRef.current;

    if (!showTerrain) {
      try {
        const terrain = await Cesium.Terrain.fromWorldTerrain();
        viewer.scene.setTerrain(terrain);
        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.verticalExaggeration = 2.0;
        setShowTerrain(true);
      } catch (err) {
        console.warn(err);
      }
    }

    if (preset === "fansipan") {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(103.775, 22.28, 4500.0),
        orientation: {
          heading: Cesium.Math.toRadians(35.0),
          pitch: Cesium.Math.toRadians(-22.0),
          roll: 0.0,
        },
        duration: 2.0,
      });
    } else if (preset === "landmark81") {
      if (buildingsTilesetRef.current) {
        buildingsTilesetRef.current.show = true;
        setShowBuildings(true);
      }
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(106.7218, 10.785, 950.0),
        orientation: {
          heading: Cesium.Math.toRadians(20.0),
          pitch: Cesium.Math.toRadians(-25.0),
          roll: 0.0,
        },
        duration: 2.0,
      });
    } else if (preset === "fuji") {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(138.7274, 35.31, 5500.0),
        orientation: {
          heading: Cesium.Math.toRadians(0.0),
          pitch: Cesium.Math.toRadians(-25.0),
          roll: 0.0,
        },
        duration: 2.0,
      });
    } else if (preset === "overview") {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(108.2772, 14.0583, 7000000.0),
        duration: 1.5,
      });
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-zinc-800 shadow-2xl bg-zinc-950"
      style={{ height }}
    >
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg bg-zinc-900/95 p-1.5 backdrop-blur border border-zinc-700/60 shadow-lg">
        <div className="flex items-center gap-1 border-r border-zinc-700/80 pr-2">
          <span className="px-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Chế độ:</span>
          <button
            onClick={() => switchMode("3d")}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === "3d" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            3D Globe
          </button>
          <button
            onClick={() => switchMode("2.5d")}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === "2.5d" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            2.5D
          </button>
          <button
            onClick={() => switchMode("2d")}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === "2d" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            2D Flat
          </button>
        </div>

        <div className="flex items-center gap-1 border-r border-zinc-700/80 pr-2">
          <span className="px-1 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Lớp:</span>
          <button
            onClick={() => switchLayer("satellite")}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              layerType === "satellite" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            Vệ tinh (ArcGIS)
          </button>
          {hasIonToken && (
            <button
              onClick={() => switchLayer("ion")}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                layerType === "ion" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              Cesium ion Aerial
            </button>
          )}
          <button
            onClick={() => switchLayer("street")}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              layerType === "street" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            Đường phố
          </button>
          <button
            onClick={() => switchLayer("carto")}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              layerType === "carto" ? "bg-sky-500 text-white shadow-sm" : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            Carto Voyager
          </button>
        </div>

        {hasIonToken && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTerrain}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                showTerrain
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <Mountain className="h-3.5 w-3.5" />
              <span>Địa hình 3D: {showTerrain ? "Bật" : "Tắt"}</span>
            </button>
            <button
              onClick={toggleBuildings}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                showBuildings
                  ? "bg-purple-500 text-white shadow-sm"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Tòa nhà 3D: {showBuildings ? "Bật" : "Tắt"}</span>
            </button>
          </div>
        )}
      </div>

      {hasIonToken && (
        <div className="absolute bottom-4 left-3 z-20 flex items-center gap-2 rounded-lg bg-zinc-900/90 p-1.5 backdrop-blur border border-zinc-700/60 shadow-lg">
          <span className="px-1 text-xs font-semibold text-zinc-400">Bay nhanh xem 3D:</span>
          <button
            onClick={() => flyToPreset("fansipan")}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-emerald-600 text-zinc-200 transition-colors"
          >
            <Mountain className="h-3.5 w-3.5 text-emerald-400" />
            <span>Đỉnh Fansipan (3.143m)</span>
          </button>
          <button
            onClick={() => flyToPreset("landmark81")}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-purple-600 text-zinc-200 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5 text-purple-400" />
            <span>Landmark 81 (TP.HCM)</span>
          </button>
          <button
            onClick={() => flyToPreset("fuji")}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-sky-600 text-zinc-200 transition-colors"
          >
            <Compass className="h-3.5 w-3.5 text-sky-400" />
            <span>Núi Phú Sĩ</span>
          </button>
          <button
            onClick={() => flyToPreset("overview")}
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-zinc-400" />
            <span>Toàn cảnh</span>
          </button>
        </div>
      )}

      {!isLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm text-white z-10">
          <CompassLoader size={110} text="Đang khởi tạo Cesium 3D Globe..." />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 text-white z-10 p-6 text-center">
          <p className="text-lg font-semibold text-red-200">Không thể tải Cesium</p>
          <p className="text-sm text-red-300 mt-2">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
