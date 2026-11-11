"use client";

import { useState, useEffect } from "react";
import { Circle, Pentagon, Trash2, MapPin, AlertCircle } from "lucide-react";
import { cn } from "@/lib";
import { formatCoordinates } from "@/utils";
import { FormInput } from "@/components/ui";
import { GEOMETRY_MODE, type GeometryMode, type GeoPoint } from "../useAirspaceGeometry";

export interface AirspaceBoundaryTabProps {
    geometryMode: GeometryMode;
    onGeometryModeChange: (mode: GeometryMode) => void;
    center: GeoPoint;
    onCenterChange: (lat: number, lng: number) => void;
    radiusMeters: number;
    onRadiusChange: (val: number) => void;
    polygonPoints: GeoPoint[];
    onRemovePolygonPoint: (index: number) => void;
    onClearPolygonPoints: () => void;
    fieldErrors?: Record<string, string>;
}

export function AirspaceBoundaryTab({
    geometryMode,
    onGeometryModeChange,
    center,
    onCenterChange,
    radiusMeters,
    onRadiusChange,
    polygonPoints,
    onRemovePolygonPoint,
    onClearPolygonPoints,
    fieldErrors = {},
}: AirspaceBoundaryTabProps) {
    const [latStr, setLatStr] = useState(() => String(center.lat ?? ""));
    const [lngStr, setLngStr] = useState(() => String(center.lng ?? ""));

    useEffect(() => {
        setLatStr(String(center.lat ?? ""));
        setLngStr(String(center.lng ?? ""));
    }, [center.lat, center.lng]);

    const handleLatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLatStr(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
            onCenterChange(parsed, center.lng);
        }
    };

    const handleLngChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLngStr(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
            onCenterChange(center.lat, parsed);
        }
    };

    const handleLatBlur = () => {
        const parsed = parseFloat(latStr);
        if (isNaN(parsed) || !isFinite(parsed) || latStr.trim() === "") {
            setLatStr(String(center.lat ?? ""));
        }
    };

    const handleLngBlur = () => {
        const parsed = parseFloat(lngStr);
        if (isNaN(parsed) || !isFinite(parsed) || lngStr.trim() === "") {
            setLngStr(String(center.lng ?? ""));
        }
    };

    return (
        <div className="space-y-4">
            <div className="form-group">
                <label className="form-label">Boundary Method</label>
                <div className="flex items-center gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
                    <button
                        type="button"
                        onClick={() => onGeometryModeChange(GEOMETRY_MODE.RADIUS)}
                        className={cn(
                            "flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer",
                            geometryMode === GEOMETRY_MODE.RADIUS
                                ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                        )}
                    >
                        <Circle className="w-3.5 h-3.5" />
                        <span>Radius (Circle)</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onGeometryModeChange(GEOMETRY_MODE.POLYGON)}
                        className={cn(
                            "flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer",
                            geometryMode === GEOMETRY_MODE.POLYGON
                                ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                        )}
                    >
                        <Pentagon className="w-3.5 h-3.5" />
                        <span>Polygon (Draw)</span>
                    </button>
                </div>
            </div>

            {(fieldErrors.geometry || fieldErrors["geometry.coordinates"]) && (
                <div className="p-2.5 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{fieldErrors.geometry || fieldErrors["geometry.coordinates"]}</span>
                </div>
            )}

            {geometryMode === GEOMETRY_MODE.RADIUS ? (
                <div className="space-y-4">
                    <div className="p-2.5 bg-[var(--color-surface-card)] rounded border border-[var(--color-border-default)] text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[var(--color-border-dark)] shrink-0" />
                        <span>Click anywhere on the map to place center point.</span>
                    </div>

                    <div className="form-row-2">
                        <FormInput
                            id="center-lat"
                            label="Center Latitude"
                            type="text"
                            inputMode="decimal"
                            value={latStr}
                            onChange={handleLatChange}
                            onBlur={handleLatBlur}
                            placeholder="10.7769"
                            className="font-mono text-xs"
                        />
                        <FormInput
                            id="center-lng"
                            label="Center Longitude"
                            type="text"
                            inputMode="decimal"
                            value={lngStr}
                            onChange={handleLngChange}
                            onBlur={handleLngBlur}
                            placeholder="106.7009"
                            className="font-mono text-xs"
                        />
                    </div>

                    <div className="form-group">
                        <div className="flex justify-between items-center">
                            <label className="form-label text-xs">Radius</label>
                            <span className="font-mono text-xs font-bold text-[var(--color-border-dark)]">
                                {radiusMeters} m
                            </span>
                        </div>
                        <input
                            type="range"
                            min="100"
                            max="10000"
                            step="50"
                            value={radiusMeters}
                            onChange={(e) => onRadiusChange(Number(e.target.value))}
                            className="w-full accent-[var(--color-border-dark)] cursor-pointer"
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-2.5 bg-[var(--color-surface-card)] rounded border border-[var(--color-border-default)] text-xs text-[var(--color-text-secondary)] flex items-center justify-between">
                        <span>Click on map to add boundary points.</span>
                        {polygonPoints.length > 0 && (
                            <button
                                type="button"
                                onClick={onClearPolygonPoints}
                                className="text-red-500 hover:text-red-600 text-xs font-medium cursor-pointer"
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[var(--color-text-primary)]">
                                Boundary Vertices ({polygonPoints.length})
                            </span>
                            {polygonPoints.length < 3 && (
                                <span className="text-xs text-amber-600 font-mono">
                                    Need {3 - polygonPoints.length} more
                                </span>
                            )}
                        </div>

                        {polygonPoints.length === 0 ? (
                            <div className="text-xs text-[var(--color-text-muted)] py-6 text-center border border-dashed border-[var(--color-border-default)] rounded bg-[var(--color-surface-card)]/50">
                                No boundary points yet. Click on the map to begin drawing.
                            </div>
                        ) : (
                            <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                                {polygonPoints.map((pt, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between px-3 py-2 bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded text-xs"
                                    >
                                        <span className="font-mono font-semibold text-[var(--color-text-muted)] w-8">
                                            #{idx + 1}
                                        </span>
                                        <span className="font-mono text-[var(--color-text-primary)]">
                                            {formatCoordinates(
                                                { latitude: pt.lat, longitude: pt.lng },
                                                6
                                            )}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onRemovePolygonPoint(idx)}
                                            title="Delete vertex"
                                            className="text-slate-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
