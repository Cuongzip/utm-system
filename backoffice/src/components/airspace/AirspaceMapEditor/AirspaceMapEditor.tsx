"use client";

import { useState } from "react";
import { Circle, Pentagon } from "lucide-react";
import { TacticalMapContainer, MapUndoClear, MapZoneAction, AirspaceLayer } from "@/components/map";
import { cn } from "@/lib";
import type { AirspaceZone, AirspaceZoneType } from "@/types";
import type { GeometryMode, GeoPoint } from "../useAirspaceGeometry";
import { AirspaceCameraController } from "./AirspaceCameraController";
import { AirspaceInteractionController } from "./AirspaceInteractionController";
import { ActiveAirspaceGraphic } from "./ActiveAirspaceGraphic";

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
    const [showContextZones, setShowContextZones] = useState(false);
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
