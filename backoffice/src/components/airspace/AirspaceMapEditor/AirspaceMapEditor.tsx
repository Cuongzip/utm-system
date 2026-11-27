"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Circle, Pentagon } from "lucide-react";
import { TacticalMapContainer, MapUndoClear, MapZoneAction, AirspaceLayer } from "@/components/map";
import { cn } from "@/lib";
import { calculatePolygonArea, formatArea, formatCoordinates } from "@/utils";
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
    onUpdatePolygonPoint: (index: number, lat: number, lng: number) => void;
    onUndoPolygonPoint: () => void;
    onClearPolygonPoints: () => void;
    zoneType: AirspaceZoneType;
    altitudeFloor: number;
    altitudeCeiling: number;
    existingZones: AirspaceZone[];
    currentZoneId?: string;
    className: string;
}

export function AirspaceMapEditor({
    geometryMode,
    onGeometryModeChange,
    center,
    onCenterChange,
    radiusMeters,
    polygonPoints,
    onAddPolygonPoint,
    onUpdatePolygonPoint,
    onUndoPolygonPoint,
    onClearPolygonPoints,
    zoneType,
    altitudeFloor,
    altitudeCeiling,
    existingZones,
    currentZoneId,
    className,
}: AirspaceMapEditorProps) {
    const t = useTranslations("airspace");
    const [showContextZones, setShowContextZones] = useState(false);
    const [hoverPoint, setHoverPoint] = useState<GeoPoint | null>(null);
    const backgroundZones = existingZones.filter((z) => z.id !== currentZoneId);

    const computedAreaSqM = useMemo(() => {
        if (geometryMode === "radius") {
            return radiusMeters > 0 ? Math.PI * radiusMeters * radiusMeters : 0;
        }
        return calculatePolygonArea(polygonPoints);
    }, [geometryMode, radiusMeters, polygonPoints]);

    return (
        <TacticalMapContainer
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
                                    ? "bg-slate-800 text-white shadow-2xs"
                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                            title={t("boundary.circleModeTitle")}
                        >
                            <Circle className="w-3.5 h-3.5" />
                            <span>{t("boundary.radiusCircle")}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onGeometryModeChange("polygon")}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                geometryMode === "polygon"
                                    ? "bg-slate-800 text-white shadow-2xs"
                                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                            title={t("boundary.polygonModeTitle")}
                        >
                            <Pentagon className="w-3.5 h-3.5" />
                            <span>{t("boundary.drawPolygon")}</span>
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
                <div className="absolute bottom-3 left-3 z-20 pointer-events-none max-w-[calc(100%-1.5rem)]">
                    <div className="px-3 py-1.5 bg-slate-900/90 backdrop-blur border border-slate-700/80 text-xs font-mono rounded shadow-lg flex flex-wrap items-center gap-2.5 text-slate-100">
                        {geometryMode === "radius" ? (
                            <>
                                <span>
                                    {t("boundary.hudCenter")}{" "}
                                    <strong className="text-white">
                                        {formatCoordinates(
                                            { latitude: center.lat, longitude: center.lng },
                                            5
                                        )}
                                    </strong>
                                </span>
                                <span className="text-slate-600">|</span>
                                <span>
                                    {t("boundary.hudRadius")}{" "}
                                    <strong className="text-white font-bold">
                                        {radiusMeters}m
                                    </strong>
                                </span>
                                <span className="text-slate-600">|</span>
                                <span>
                                    {t("boundary.hudArea")}{" "}
                                    <strong className="text-cyan-300 font-bold">
                                        {formatArea(computedAreaSqM)}
                                    </strong>
                                </span>
                            </>
                        ) : (
                            <>
                                <span>
                                    {t("boundary.hudVertices")}{" "}
                                    <strong className="text-white">
                                        {t("boundary.hudPts", { count: polygonPoints.length })}
                                    </strong>
                                    {polygonPoints.length < 3 && (
                                        <span className="text-amber-400 ml-1.5 font-medium">
                                            {t("boundary.hudMin3")}
                                        </span>
                                    )}
                                </span>
                                {computedAreaSqM > 0 && (
                                    <>
                                        <span className="text-slate-600">|</span>
                                        <span>
                                            {t("boundary.hudArea")}{" "}
                                            <strong className="text-cyan-300 font-bold">
                                                {formatArea(computedAreaSqM)}
                                            </strong>
                                        </span>
                                    </>
                                )}
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
                onUpdatePolygonPoint={onUpdatePolygonPoint}
                onHoverPointChange={setHoverPoint}
            />

            <ActiveAirspaceGraphic
                geometryMode={geometryMode}
                center={center}
                radiusMeters={radiusMeters}
                polygonPoints={polygonPoints}
                hoverPoint={geometryMode === "polygon" ? hoverPoint : null}
                zoneType={zoneType}
                altitudeFloor={altitudeFloor}
                altitudeCeiling={altitudeCeiling}
            />

            {showContextZones && backgroundZones.length > 0 && (
                <AirspaceLayer zones={backgroundZones} />
            )}
        </TacticalMapContainer>
    );
}
