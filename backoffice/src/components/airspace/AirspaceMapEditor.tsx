"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Circle, Pentagon } from "lucide-react";
import {
    TacticalMapContainer,
    MapUndoClear,
    MapZoneAction,
    AirspaceLayer,
    useCesium,
} from "@/components/map";
import { fitCameraToBounds } from "@/components/map/cesiumUtils";
import { MAP_TOKENS } from "@/components/map/mapTokens";
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
    onAltitudeCeilingChange?: (val: number) => void;
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

    const hasMovedRef = useRef(false);
    const startPosRef = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function setupHandler() {
            const Cesium = await import("cesium");
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

            handler.setInputAction((event: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                hasMovedRef.current = false;
                startPosRef.current = { x: event.position.x, y: event.position.y };
            }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

            handler.setInputAction((movement: { endPosition: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;
                if (
                    startPosRef.current &&
                    Math.hypot(
                        movement.endPosition.x - startPosRef.current.x,
                        movement.endPosition.y - startPosRef.current.y
                    ) > 5
                ) {
                    hasMovedRef.current = true;
                }
                viewer.scene.canvas.style.cursor = "crosshair";
            }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

            handler.setInputAction(() => {
                startPosRef.current = null;
            }, Cesium.ScreenSpaceEventType.LEFT_UP);

            handler.setInputAction((click: { position: import("cesium").Cartesian2 }) => {
                if (!viewer || viewer.isDestroyed()) return;

                if (hasMovedRef.current) {
                    hasMovedRef.current = false;
                    return;
                }

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
    geometryMode,
    center,
    radiusMeters,
    polygonPoints,
}: {
    geometryMode: GeometryMode;
    center: GeoPoint;
    radiusMeters: number;
    polygonPoints: GeoPoint[];
}) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFittedRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        if (hasInitialFittedRef.current) return;

        let pointsToFit: { lat: number; lng: number }[] = [];
        let minHeight = 1500;

        if (geometryMode === "radius") {
            if (
                center &&
                typeof center.lat === "number" &&
                typeof center.lng === "number" &&
                !isNaN(center.lat) &&
                !isNaN(center.lng) &&
                (center.lat !== 0 || center.lng !== 0)
            ) {
                pointsToFit = [{ lat: center.lat, lng: center.lng }];
                minHeight = Math.max(radiusMeters * 2.8, 1500);
            }
        } else if (polygonPoints && polygonPoints.length > 0) {
            pointsToFit = polygonPoints;
            minHeight = 1200;
        }

        if (pointsToFit.length === 0) return;

        const timer = setTimeout(() => {
            if (!viewer || viewer.isDestroyed()) return;
            const success = fitCameraToBounds(viewer, pointsToFit, {
                animate: true,
                duration: 0.8,
                minHeight,
            });
            if (success) {
                hasInitialFittedRef.current = true;
            }
        }, 50);

        return () => clearTimeout(timer);
    }, [viewer, isLoaded, geometryMode, center, radiusMeters, polygonPoints]);

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
    onAltitudeCeilingChange,
    existingZones = [],
    currentZoneId,
    className = "",
}: AirspaceMapEditorProps) {
    const [showContextZones, setShowContextZones] = useState(false);
    const [altInput, setAltInput] = useState(String(altitudeCeiling ?? 120));

    useEffect(() => {
        setAltInput(String(altitudeCeiling ?? 120));
    }, [altitudeCeiling]);

    const handleAltChange = (val: string) => {
        setAltInput(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0) {
            onAltitudeCeilingChange?.(parsed);
        }
    };

    const backgroundZones = existingZones.filter((z) => z.id !== currentZoneId);

    return (
        <TacticalMapContainer
            initialMode="2d"
            className={className}
            header={
                <div className="px-[18px] py-2.5 border-b border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-panel)] z-10">
                    <div className="flex items-center h-[34px] gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
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
                            <MapUndoClear
                                onUndo={onUndoPolygonPoint}
                                onClear={onClearPolygonPoints}
                                disabled={polygonPoints.length === 0}
                            />
                        )}

                        <div className="flex items-center h-[34px] gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-card)] px-2.5 py-1 rounded border border-[var(--color-border-default)]">
                            <span className="text-[11px] font-mono uppercase text-[var(--color-text-muted)]">
                                Alt:
                            </span>
                            <input
                                type="number"
                                min="1"
                                max="5000"
                                value={altInput}
                                onChange={(e) => handleAltChange(e.target.value)}
                                className="w-12 h-6 px-1 border border-[var(--color-border-default)] rounded text-center font-mono text-xs bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--color-border-dark)]"
                            />
                            <span className="font-mono text-slate-400 text-[11px]">m</span>
                        </div>

                        <MapZoneAction
                            active={showContextZones}
                            onToggle={() => setShowContextZones((prev) => !prev)}
                            count={backgroundZones.length}
                        />
                    </div>
                </div>
            }
            overlay={
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
            }
        >
            <AirspaceCameraController
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
        </TacticalMapContainer>
    );
}

export default AirspaceMapEditor;
