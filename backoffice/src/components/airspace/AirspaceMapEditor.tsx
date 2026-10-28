"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Circle, Pentagon, Undo2, Trash2, Compass, Layers } from "lucide-react";
import { BaseCesiumMap, useCesium } from "@/components/map";
import { AirspaceLayer } from "@/components/map/layers/AirspaceLayer";
import { MAP_TOKENS } from "@/components/map/mapTokens";
import { ChamferCard } from "@/components/ui";
import { cn } from "@/lib";
import type { AirspaceZone, AirspaceZoneType } from "@/types";
import { GeometryMode, GeoPoint, generateCircleCoordinates } from "./useAirspaceGeometry";

export interface AirspaceMapEditorProps {
    geometryMode: GeometryMode;
    onGeometryModeChange: (mode: GeometryMode) => void;
    center: GeoPoint;
    onCenterChange: (lat: number, lng: number) => void;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
    onAddPolygonPoint: (lat: number, lng: number) => void;
    onUndoPolygonPoint: () => void;
    onClearPolygonPoints: () => void;
    zoneType: AirspaceZoneType;
    altitudeCeiling: number;
    existingZones?: AirspaceZone[];
    currentZoneId?: string;
    className?: string;
}

const TYPE_COLOR_MAP: Record<string, string> = {
    no_fly_zone: MAP_TOKENS.colors.airspace.no_fly_zone,
    restricted: MAP_TOKENS.colors.airspace.restricted,
    hub_corridor: MAP_TOKENS.colors.airspace.hub_corridor,
    warning: MAP_TOKENS.colors.airspace.warning,
};

function AirspaceInteractionController({
    geometryMode,
    onCenterChange,
    onAddPolygonPoint,
}: {
    geometryMode: GeometryMode;
    onCenterChange: (lat: number, lng: number) => void;
    onAddPolygonPoint: (lat: number, lng: number) => void;
}) {
    const { viewer, isLoaded } = useCesium();
    const modeRef = useRef(geometryMode);
    const onCenterChangeRef = useRef(onCenterChange);
    const onAddPolygonPointRef = useRef(onAddPolygonPoint);

    useEffect(() => {
        modeRef.current = geometryMode;
        onCenterChangeRef.current = onCenterChange;
        onAddPolygonPointRef.current = onAddPolygonPoint;
    }, [geometryMode, onCenterChange, onAddPolygonPoint]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function setupHandler() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

            handler.setInputAction((movement: { endPosition: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                viewer.scene.canvas.style.cursor = "crosshair";
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

            handler.setInputAction((click: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;

                const ray = viewer.camera.getPickRay(click.position);
                if (ray) {
                    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
                    if (cartesian) {
                        const carto = Cesium.Cartographic.fromCartesian(cartesian);
                        const lat = Number(Cesium.Math.toDegrees(carto.latitude).toFixed(6));
                        const lng = Number(Cesium.Math.toDegrees(carto.longitude).toFixed(6));

                        if (modeRef.current === "radius") {
                            onCenterChangeRef.current(lat, lng);
                        } else {
                            onAddPolygonPointRef.current(lat, lng);
                        }
                        viewer.scene.requestRender();
                    }
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            return () => {
                handler.destroy();
            };
        }

        const cleanupPromise = setupHandler();

        return () => {
            cancelled = true;
            cleanupPromise.then((cleanup) => cleanup?.());
        };
    }, [viewer, isLoaded]);

    return null;
}

function ActiveAirspaceGraphic({
    geometryMode,
    center,
    radiusMeters,
    polygonPoints,
    zoneType,
    altitudeCeiling,
}: {
    geometryMode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
    zoneType: AirspaceZoneType;
    altitudeCeiling: number;
}) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderGraphic() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            entityIdsRef.current.forEach((id) => {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            });
            entityIdsRef.current = [];

            const newEntityIds: string[] = [];
            const hexColor = TYPE_COLOR_MAP[zoneType] || "#06b6d4";
            const baseColor = Cesium.Color.fromCssColorString(hexColor);
            const fillColor = Cesium.Color.fromAlpha(baseColor, 0.35);
            const outlineColor = Cesium.Color.fromAlpha(baseColor, 0.9);
            const ceiling = Math.max(altitudeCeiling || 120, 20);

            if (geometryMode === "radius") {
                const centerPoint = viewer.entities.add({
                    id: "airspace-editor-center",
                    position: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, 0),
                    point: {
                        pixelSize: 10,
                        color: outlineColor,
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 2,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                });
                newEntityIds.push(centerPoint.id);

                const circleCoords = generateCircleCoordinates(
                    center.lat,
                    center.lng,
                    radiusMeters,
                    36
                );
                const degreesArray: number[] = [];
                circleCoords.forEach(([lng, lat]) => {
                    degreesArray.push(lng, lat);
                });

                if (degreesArray.length >= 6) {
                    const circleEntity = viewer.entities.add({
                        id: "airspace-editor-circle-volume",
                        polygon: {
                            hierarchy: new Cesium.PolygonHierarchy(
                                Cesium.Cartesian3.fromDegreesArray(degreesArray)
                            ),
                            height: 0,
                            extrudedHeight: ceiling,
                            material: fillColor,
                            outline: true,
                            outlineColor: outlineColor,
                            outlineWidth: 2,
                            closeTop: true,
                            closeBottom: true,
                        },
                    });
                    newEntityIds.push(circleEntity.id);
                }
            } else {
                polygonPoints.forEach((p, idx) => {
                    const isFirst = idx === 0;
                    const vertexEntity = viewer.entities.add({
                        id: `airspace-editor-vertex-${idx}`,
                        position: Cesium.Cartesian3.fromDegrees(p.lng, p.lat, 0),
                        point: {
                            pixelSize: isFirst ? 11 : 8,
                            color: isFirst ? Cesium.Color.WHITE : outlineColor,
                            outlineColor: isFirst ? outlineColor : Cesium.Color.WHITE,
                            outlineWidth: 2,
                            disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        },
                    });
                    newEntityIds.push(vertexEntity.id);
                });

                if (polygonPoints.length >= 2) {
                    const degreesArray: number[] = [];
                    polygonPoints.forEach((p) => {
                        degreesArray.push(p.lng, p.lat);
                    });

                    if (polygonPoints.length >= 3) {
                        const polygonEntity = viewer.entities.add({
                            id: "airspace-editor-polygon-volume",
                            polygon: {
                                hierarchy: new Cesium.PolygonHierarchy(
                                    Cesium.Cartesian3.fromDegreesArray(degreesArray)
                                ),
                                height: 0,
                                extrudedHeight: ceiling,
                                material: fillColor,
                                outline: true,
                                outlineColor: outlineColor,
                                outlineWidth: 2,
                                closeTop: true,
                                closeBottom: true,
                            },
                        });
                        newEntityIds.push(polygonEntity.id);
                    } else {
                        const lineEntity = viewer.entities.add({
                            id: "airspace-editor-polyline",
                            polyline: {
                                positions: Cesium.Cartesian3.fromDegreesArray(degreesArray),
                                width: 3,
                                material: outlineColor,
                                clampToGround: true,
                            },
                        });
                        newEntityIds.push(lineEntity.id);
                    }
                }
            }

            entityIdsRef.current = newEntityIds;
            viewer.scene.requestRender();
        }

        renderGraphic();

        return () => {
            cancelled = true;
        };
    }, [
        viewer,
        isLoaded,
        geometryMode,
        center,
        radiusMeters,
        polygonPoints,
        zoneType,
        altitudeCeiling,
    ]);

    return null;
}

function AirspaceCameraController({
    recenterTrigger,
    geometryMode,
    center,
    radiusMeters,
    polygonPoints,
}: {
    recenterTrigger: number;
    geometryMode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
}) {
    const { viewer, isLoaded } = useCesium();

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed() || recenterTrigger === 0) return;
        let cancelled = false;

        async function flyToTarget() {
            const Cesium = await import("cesium");
            if (cancelled || !viewer || viewer.isDestroyed()) return;

            if (geometryMode === "radius") {
                const zoomHeight = Math.max(radiusMeters * 3.5, 1500);
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(center.lng, center.lat, zoomHeight),
                    duration: 0.8,
                });
            } else if (polygonPoints.length > 0) {
                let sumLng = 0;
                let sumLat = 0;
                polygonPoints.forEach((p) => {
                    sumLng += p.lng;
                    sumLat += p.lat;
                });
                const cLng = sumLng / polygonPoints.length;
                const cLat = sumLat / polygonPoints.length;
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(cLng, cLat, 2500),
                    duration: 0.8,
                });
            }
        }

        flyToTarget();

        return () => {
            cancelled = true;
        };
    }, [viewer, isLoaded, recenterTrigger, geometryMode, center, radiusMeters, polygonPoints]);

    return null;
}

export function AirspaceMapEditor({
    geometryMode,
    onGeometryModeChange,
    center,
    onCenterChange,
    radiusMeters,
    polygonPoints,
    onAddPolygonPoint,
    onUndoPolygonPoint,
    onClearPolygonPoints,
    zoneType,
    altitudeCeiling,
    existingZones = [],
    currentZoneId,
    className = "",
}: AirspaceMapEditorProps) {
    const [showContextZones, setShowContextZones] = useState(true);
    const [recenterTrigger, setRecenterTrigger] = useState(1);

    const backgroundZones = existingZones.filter((z) => z.id !== currentZoneId);

    const handleFitToZone = useCallback(() => {
        setRecenterTrigger((prev) => prev + 1);
    }, []);

    return (
        <ChamferCard size="lg" className={cn("w-full h-full", className)}>
            <div className="flex flex-col h-full bg-[var(--color-surface-panel)] overflow-hidden">
                <div className="px-[18px] py-2.5 border-b border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-panel)] z-10">
                    <div className="flex items-center gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
                        <button
                            type="button"
                            onClick={() => onGeometryModeChange("radius")}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                geometryMode === "radius"
                                    ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                            title="Circle radius mode"
                        >
                            <Circle className="w-3.5 h-3.5" />
                            <span>Radius (Circle)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onGeometryModeChange("polygon")}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                geometryMode === "polygon"
                                    ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                            title="Draw polygon corridor"
                        >
                            <Pentagon className="w-3.5 h-3.5" />
                            <span>Draw Polygon</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {geometryMode === "polygon" && (
                            <div className="flex items-center gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
                                <button
                                    type="button"
                                    onClick={onUndoPolygonPoint}
                                    disabled={polygonPoints.length === 0}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] disabled:opacity-40 cursor-pointer"
                                    title="Undo last point"
                                >
                                    <Undo2 className="w-3.5 h-3.5" />
                                    <span>Undo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={onClearPolygonPoints}
                                    disabled={polygonPoints.length === 0}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded text-red-500 hover:bg-red-50 disabled:opacity-40 cursor-pointer"
                                    title="Clear all points"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Clear</span>
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-card)] px-2.5 py-1 rounded border border-[var(--color-border-default)]">
                            <span className="text-[11px] font-mono uppercase text-[var(--color-text-muted)]">
                                Ceiling:
                            </span>
                            <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                                {altitudeCeiling}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">m</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowContextZones((prev) => !prev)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border transition-colors cursor-pointer",
                                showContextZones
                                    ? "bg-[var(--color-surface-card)] border-[var(--color-border-default)] text-[var(--color-border-dark)] font-bold"
                                    : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-card)]"
                            )}
                            title="Toggle background airspace sectors"
                        >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Zones ({backgroundZones.length})</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleFitToZone}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-[var(--color-surface-card)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] cursor-pointer"
                            title="Recenter camera on zone"
                        >
                            <Compass className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                            <span>Recenter</span>
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 w-full min-h-[420px] overflow-hidden bg-slate-100">
                    <BaseCesiumMap mode="3d" layerType="satellite">
                        <AirspaceCameraController
                            recenterTrigger={recenterTrigger}
                            geometryMode={geometryMode}
                            center={center}
                            radiusMeters={radiusMeters}
                            polygonPoints={polygonPoints}
                        />

                        <AirspaceInteractionController
                            geometryMode={geometryMode}
                            onCenterChange={onCenterChange}
                            onAddPolygonPoint={onAddPolygonPoint}
                        />

                        <ActiveAirspaceGraphic
                            geometryMode={geometryMode}
                            center={center}
                            radiusMeters={radiusMeters}
                            polygonPoints={polygonPoints}
                            zoneType={zoneType}
                            altitudeCeiling={altitudeCeiling}
                        />

                        {showContextZones && backgroundZones.length > 0 && (
                            <AirspaceLayer zones={backgroundZones} autoFitBounds={false} />
                        )}
                    </BaseCesiumMap>

                    <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                        <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 text-xs font-mono rounded shadow-lg flex items-center gap-3 text-slate-100">
                            {geometryMode === "radius" ? (
                                <>
                                    <span>
                                        Center:{" "}
                                        <strong className="text-white">
                                            {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
                                        </strong>
                                    </span>
                                    <span className="text-slate-500">|</span>
                                    <span>
                                        Radius:{" "}
                                        <strong className="text-cyan-400 font-bold">
                                            {radiusMeters}m
                                        </strong>
                                    </span>
                                </>
                            ) : (
                                <>
                                    <span>
                                        Vertices:{" "}
                                        <strong className="text-white">
                                            {polygonPoints.length} points
                                        </strong>
                                        {polygonPoints.length < 3 && (
                                            <span className="text-amber-400 ml-1.5 font-medium">
                                                (min 3 required)
                                            </span>
                                        )}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

export default AirspaceMapEditor;
