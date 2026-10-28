"use client";

import React, { useState } from "react";
import {
    Circle,
    Pentagon,
    Trash2,
    MapPin,
    Code,
    ChevronDown,
    ChevronUp,
    AlertCircle,
} from "lucide-react";
import { ChamferCard, CustomSelect, FormInput, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import type { AirspaceZoneType, AirspaceZoneStatus, Hub } from "@/types";
import { GeometryMode, GeoPoint, GeoJsonPolygon } from "./useAirspaceGeometry";

export interface AirspaceFormSidebarProps {
    name: string;
    onNameChange: (val: string) => void;
    zoneType: AirspaceZoneType;
    onZoneTypeChange: (val: AirspaceZoneType) => void;
    status: AirspaceZoneStatus;
    onStatusChange: (val: AirspaceZoneStatus) => void;
    altitudeCeiling: number;
    onAltitudeCeilingChange: (val: number) => void;
    hubId: string;
    onHubIdChange: (val: string) => void;
    description: string;
    onDescriptionChange: (val: string) => void;
    hubs?: Hub[];

    // Geometry
    geometryMode: GeometryMode;
    onGeometryModeChange: (mode: GeometryMode) => void;
    center: GeoPoint;
    onCenterChange: (lat: number, lng: number) => void;
    radiusMeters: number;
    onRadiusChange: (val: number) => void;
    polygonPoints: GeoPoint[];
    onRemovePolygonPoint: (index: number) => void;
    onClearPolygonPoints: () => void;
    computedGeoJson: GeoJsonPolygon | null;

    activeTab: "details" | "geometry";
    onTabChange: (tab: "details" | "geometry") => void;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
    className?: string;
}

const ZONE_TYPE_OPTIONS: SelectOption[] = [
    { value: "no_fly_zone", label: "No-Fly Zone (NFZ)" },
    { value: "restricted", label: "Restricted Airspace" },
    { value: "hub_corridor", label: "Hub Corridor" },
    { value: "warning", label: "Advisory / Warning" },
];

const ZONE_STATUS_OPTIONS: SelectOption[] = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
];

export function AirspaceFormSidebar({
    name,
    onNameChange,
    zoneType,
    onZoneTypeChange,
    status,
    onStatusChange,
    altitudeCeiling,
    onAltitudeCeilingChange,
    hubId,
    onHubIdChange,
    description,
    onDescriptionChange,
    hubs = [],
    geometryMode,
    onGeometryModeChange,
    center,
    onCenterChange,
    radiusMeters,
    onRadiusChange,
    polygonPoints,
    onRemovePolygonPoint,
    onClearPolygonPoints,
    computedGeoJson,
    activeTab,
    onTabChange,
    fieldErrors = {},
    onClearFieldError,
    className = "",
}: AirspaceFormSidebarProps) {
    const [showJsonPreview, setShowJsonPreview] = useState(false);

    const hubOptions: SelectOption[] = [
        { value: "", label: "None (General Airspace)" },
        ...hubs.map((h) => ({
            value: h.id,
            label: h.name ? `${h.name} (${h.code || "HUB"})` : h.id,
        })),
    ];

    const hasGeometryError = Boolean(
        fieldErrors.geometry ||
        fieldErrors["geometry.coordinates"] ||
        (geometryMode === "polygon" && polygonPoints.length < 3 && fieldErrors.geometry)
    );

    const hasDetailErrors = Boolean(
        fieldErrors.name ||
        fieldErrors.zoneType ||
        fieldErrors.altitudeCeiling ||
        fieldErrors.status
    );

    return (
        <ChamferCard size="lg" className={cn("w-full h-full", className)}>
            <div className="flex flex-col h-full bg-[var(--color-surface-panel)] select-none overflow-hidden">
                <div className="grid grid-cols-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-panel)] text-xs">
                    <button
                        type="button"
                        onClick={() => onTabChange("details")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "details"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            hasDetailErrors && "text-red-600"
                        )}
                    >
                        <span>Details</span>
                        {hasDetailErrors && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("geometry")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "geometry"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            hasGeometryError && "text-red-600"
                        )}
                    >
                        <span>
                            Boundary{" "}
                            {geometryMode === "polygon" && polygonPoints.length > 0
                                ? `(${polygonPoints.length})`
                                : ""}
                        </span>
                        {hasGeometryError && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>
                </div>
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    {activeTab === "details" ? (
                        <div className="space-y-4">
                            <FormInput
                                id="airspaceName"
                                label="Zone Name"
                                required
                                placeholder="e.g. SGN Airport Restricted Sector"
                                value={name}
                                onChange={(e) => {
                                    onNameChange(e.target.value);
                                    onClearFieldError?.("name");
                                }}
                                error={fieldErrors.name}
                            />

                            <div className="form-group">
                                <label className="form-label">
                                    Classification Type <span className="text-red-500">*</span>
                                </label>
                                <CustomSelect
                                    value={zoneType}
                                    onValueChange={(val: string) => {
                                        onZoneTypeChange(val as AirspaceZoneType);
                                        onClearFieldError?.("zoneType");
                                    }}
                                    options={ZONE_TYPE_OPTIONS}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Operational Status</label>
                                <CustomSelect
                                    value={status}
                                    onValueChange={(val: string) => {
                                        onStatusChange(val as AirspaceZoneStatus);
                                        onClearFieldError?.("status");
                                    }}
                                    options={ZONE_STATUS_OPTIONS}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Associated Vertiport Hub</label>
                                <CustomSelect
                                    value={hubId}
                                    onValueChange={(val: string) => {
                                        onHubIdChange(val);
                                        onClearFieldError?.("hubId");
                                    }}
                                    options={hubOptions}
                                />
                                <span className="text-[11px] text-[var(--color-text-muted)]">
                                    Optional: associate this restriction sector with a hub station.
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="altitudeCeiling">
                                    Altitude Ceiling Limit (m){" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        id="altitudeCeiling"
                                        type="number"
                                        min="10"
                                        max="5000"
                                        value={altitudeCeiling}
                                        onChange={(e) => {
                                            onAltitudeCeilingChange(Number(e.target.value) || 0);
                                            onClearFieldError?.("altitudeCeiling");
                                        }}
                                        className={cn(
                                            "form-input font-mono pr-14",
                                            fieldErrors.altitudeCeiling && "form-input-error"
                                        )}
                                    />
                                    <span className="absolute right-3 top-2.5 text-xs text-[var(--color-text-muted)] font-mono pointer-events-none">
                                        meters
                                    </span>
                                </div>
                                {fieldErrors.altitudeCeiling && (
                                    <span className="text-xs text-red-500 mt-1">
                                        {fieldErrors.altitudeCeiling}
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="zoneDesc">
                                    Description / Operational Notes
                                </label>
                                <textarea
                                    id="zoneDesc"
                                    rows={3}
                                    value={description}
                                    onChange={(e) => {
                                        onDescriptionChange(e.target.value);
                                        onClearFieldError?.("description");
                                    }}
                                    placeholder="Enter legal basis, operational constraints, or activation schedule..."
                                    className="form-input resize-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">Boundary Method</label>
                                <div className="flex items-center gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
                                    <button
                                        type="button"
                                        onClick={() => onGeometryModeChange("radius")}
                                        className={cn(
                                            "flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer",
                                            geometryMode === "radius"
                                                ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                        )}
                                    >
                                        <Circle className="w-3.5 h-3.5" />
                                        <span>Radius (Circle)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onGeometryModeChange("polygon")}
                                        className={cn(
                                            "flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer",
                                            geometryMode === "polygon"
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
                                    <span>
                                        {fieldErrors.geometry ||
                                            fieldErrors["geometry.coordinates"]}
                                    </span>
                                </div>
                            )}

                            {geometryMode === "radius" ? (
                                <div className="space-y-4">
                                    <div className="p-2.5 bg-[var(--color-surface-card)] rounded border border-[var(--color-border-default)] text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-[var(--color-border-dark)] shrink-0" />
                                        <span>
                                            Click anywhere on the map to place center point.
                                        </span>
                                    </div>

                                    <div className="form-row-2">
                                        <div className="form-group">
                                            <label className="form-label text-xs">
                                                Center Latitude
                                            </label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={center.lat}
                                                onChange={(e) =>
                                                    onCenterChange(
                                                        Number(e.target.value) || 0,
                                                        center.lng
                                                    )
                                                }
                                                className="form-input font-mono text-xs"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label text-xs">
                                                Center Longitude
                                            </label>
                                            <input
                                                type="number"
                                                step="0.000001"
                                                value={center.lng}
                                                onChange={(e) =>
                                                    onCenterChange(
                                                        center.lat,
                                                        Number(e.target.value) || 0
                                                    )
                                                }
                                                className="form-input font-mono text-xs"
                                            />
                                        </div>
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
                                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                                            {[500, 1000, 2000, 5000].map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => onRadiusChange(preset)}
                                                    className={cn(
                                                        "py-1 text-xs font-mono border rounded transition-colors cursor-pointer",
                                                        radiusMeters === preset
                                                            ? "border-[var(--color-border-dark)] bg-[var(--color-border-dark)] text-white font-semibold"
                                                            : "border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                                    )}
                                                >
                                                    {preset >= 1000
                                                        ? `${preset / 1000}km`
                                                        : `${preset}m`}
                                                </button>
                                            ))}
                                        </div>
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
                                                No boundary points yet. Click on the map to begin
                                                drawing.
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
                                                            {pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onRemovePolygonPoint(idx)
                                                            }
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

                            <div className="border border-[var(--color-border-default)] rounded overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setShowJsonPreview((prev) => !prev)}
                                    className="w-full px-3 py-2 bg-[var(--color-surface-card)] flex items-center justify-between text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Code className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                                        <span>GeoJSON Coordinates Preview</span>
                                    </div>
                                    {showJsonPreview ? (
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                </button>
                                {showJsonPreview && (
                                    <pre className="p-3 text-[11px] font-mono bg-slate-900 text-slate-200 max-h-[140px] overflow-auto">
                                        {computedGeoJson
                                            ? JSON.stringify(computedGeoJson, null, 2)
                                            : "Incomplete geometry (minimum 3 points required for polygon)"}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}

export default AirspaceFormSidebar;
