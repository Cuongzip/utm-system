"use client";

import { useEffect, useRef, useState } from "react";
import type { Viewer } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

interface Map2DProps {
  height?: string;
}

export default function Map2D({ height = "650px" }: Map2DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layerType, setLayerType] = useState<"street" | "carto" | "satellite">("street");
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    let viewer: Viewer | null = null;

    async function init2DMap() {
      if (!containerRef.current) return;

      try {
        window.CESIUM_BASE_URL = "/cesium";
        const Cesium = await import("cesium");

        Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN || "";

        const streetProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer",
          { enablePickFeatures: false }
        );

        viewer = new Cesium.Viewer(containerRef.current, {
          sceneMode: Cesium.SceneMode.SCENE2D,
          baseLayer: new Cesium.ImageryLayer(streetProvider),
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
        });

        viewerRef.current = viewer;

        viewer.useBrowserRecommendedResolution = false;
        viewer.resolutionScale = 1.0;
        viewer.scene.globe.depthTestAgainstTerrain = false;

        viewer.scene.fog.enabled = false;
        viewer.scene.globe.showGroundAtmosphere = false;
        if (viewer.scene.sun) viewer.scene.sun.show = false;
        if (viewer.scene.moon) viewer.scene.moon.show = false;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(108.2772, 14.0583, 4000000.0),
        });

        setIsLoaded(true);
      } catch (err: unknown) {
        console.error("Failed to initialize 2D Map:", err);
        const errorMessage = err instanceof Error ? err.message : "Khởi tạo bản đồ 2D thất bại";
        setError(errorMessage);
      }
    }

    init2DMap();

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, []);

  const switchLayer = async (type: "street" | "carto" | "satellite") => {
    if (!viewerRef.current) return;
    const Cesium = await import("cesium");
    const viewer = viewerRef.current;
    viewer.imageryLayers.removeAll();

    if (type === "street") {
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
    } else if (type === "satellite") {
      const provider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
        "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
        { enablePickFeatures: false }
      );
      viewer.imageryLayers.addImageryProvider(provider);
    }
    setLayerType(type);
    viewer.scene.requestRender();
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-zinc-800 shadow-2xl bg-zinc-950"
      style={{ height }}
    >
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-lg bg-zinc-900/90 p-1.5 backdrop-blur border border-zinc-700/60 shadow-lg">
        <span className="px-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Lớp 2D:</span>
        <button
          onClick={() => switchLayer("street")}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            layerType === "street"
              ? "bg-amber-500 text-black font-semibold shadow-sm"
              : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Đường phố (Esri)
        </button>
        <button
          onClick={() => switchLayer("carto")}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            layerType === "carto"
              ? "bg-amber-500 text-black font-semibold shadow-sm"
              : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Carto Voyager
        </button>
        <button
          onClick={() => switchLayer("satellite")}
          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            layerType === "satellite"
              ? "bg-amber-500 text-black font-semibold shadow-sm"
              : "text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Vệ tinh 2D
        </button>
      </div>

      {!isLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white z-10 gap-3">
          <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-zinc-300">Đang khởi tạo Bản đồ 2D (Flat Map)...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/80 text-white z-10 p-6 text-center">
          <p className="text-lg font-semibold text-red-200">Không thể tải Bản đồ 2D</p>
          <p className="text-sm text-red-300 mt-2">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
