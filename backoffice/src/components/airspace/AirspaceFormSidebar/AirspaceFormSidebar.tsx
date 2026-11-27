"use client";

import { useTranslations } from "next-intl";
import { ChamferCard } from "@/components/ui";
import { cn } from "@/lib";
import type { AirspaceZoneFormPayload, Hub } from "@/types";
import type { GeometryMode, GeoPoint } from "../useAirspaceGeometry";
import { AirspaceDetailsTab } from "./AirspaceDetailsTab";
import { AirspaceBoundaryTab } from "./AirspaceBoundaryTab";

export interface AirspaceFormSidebarProps {
    formData: AirspaceZoneFormPayload;
    onFormChange: <K extends keyof AirspaceZoneFormPayload>(
        field: K,
        value: AirspaceZoneFormPayload[K]
    ) => void;
    isEdit: boolean;
    hubs: Hub[];

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

    activeTab: "details" | "geometry";
    onTabChange: (tab: "details" | "geometry") => void;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

export function AirspaceFormSidebar({
    formData,
    onFormChange,
    isEdit = false,
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
    activeTab,
    onTabChange,
    fieldErrors = {},
    onClearFieldError,
}: AirspaceFormSidebarProps) {
    const t = useTranslations("airspace");
    const hasGeometryError = Boolean(fieldErrors.geometry || fieldErrors["geometry.coordinates"]);

    const hasDetailErrors = Boolean(
        fieldErrors.code ||
        fieldErrors.name ||
        fieldErrors.zoneType ||
        fieldErrors.altitudeFloor ||
        fieldErrors.altitudeCeiling ||
        fieldErrors.effectiveStart ||
        fieldErrors.effectiveEnd ||
        fieldErrors.status
    );

    return (
        <ChamferCard size="lg" className="w-full h-full min-h-0">
            <div className="flex flex-col h-full min-h-0 bg-[var(--color-surface-panel)] select-none overflow-hidden">
                <div className="grid grid-cols-2 border-b border-[var(--color-border-default)] bg-[var(--color-surface-panel)] text-xs shrink-0">
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
                        <span>{t("editor.tabDetails")}</span>
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
                            {t("editor.tabBoundary")}{" "}
                            {geometryMode === "polygon" && polygonPoints.length > 0
                                ? `(${polygonPoints.length})`
                                : ""}
                        </span>
                        {hasGeometryError && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>
                </div>
                <div className="flex-1 min-h-0 p-5 overflow-y-auto space-y-4">
                    {activeTab === "details" ? (
                        <AirspaceDetailsTab
                            formData={formData}
                            onFormChange={onFormChange}
                            isEdit={isEdit}
                            hubs={hubs}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    ) : (
                        <AirspaceBoundaryTab
                            geometryMode={geometryMode}
                            onGeometryModeChange={onGeometryModeChange}
                            center={center}
                            onCenterChange={onCenterChange}
                            radiusMeters={radiusMeters}
                            onRadiusChange={onRadiusChange}
                            polygonPoints={polygonPoints}
                            onRemovePolygonPoint={onRemovePolygonPoint}
                            onClearPolygonPoints={onClearPolygonPoints}
                            fieldErrors={fieldErrors}
                        />
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}
