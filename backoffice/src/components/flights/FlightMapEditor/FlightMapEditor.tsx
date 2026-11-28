"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { MousePointer, Plus } from "lucide-react";
import {
    TacticalMapContainer,
    AltitudeProfile,
    AirspaceLayer,
    MapUndoClear,
    MapZoneAction,
} from "@/components/map";
import { useAirspaceAll } from "@/hooks";
import { cn } from "@/lib";
import { AIRSPACE_ZONE_STATUS, type Hub, type ProfilePoint } from "@/types";
import type { FlightWaypoint } from "../useFlightRoute";
import { FlightInteractionController, type FlightEditorMode } from "./FlightInteractionController";
import { FlightCameraController } from "./FlightCameraController";
import { FlightRouteRenderer } from "./FlightRouteRenderer";

interface FlightMapEditorProps {
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    waypoints: FlightWaypoint[];
    cruisingAltitude: number;
    onCruisingAltitudeChange: (alt: number) => void;
    selectedWaypointId: string | null;
    onAddWaypoint: (lat: number, lng: number, altitude: number) => void;
    onMoveWaypoint: (id: string, lat: number, lng: number) => void;
    onSelectWaypoint: (waypoint: FlightWaypoint | null) => void;
    onUndoWaypoint: () => void;
    onClearWaypoints: () => void;
    isReadOnly: boolean;
    className?: string;
}

export function FlightMapEditor({
    departureHub,
    arrivalHub,
    waypoints = [],
    cruisingAltitude = 120,
    onCruisingAltitudeChange,
    selectedWaypointId,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
    onUndoWaypoint,
    onClearWaypoints,
    isReadOnly = false,
    className = "",
}: FlightMapEditorProps) {
    const t = useTranslations("flights.map");
    const [mode, setMode] = useState<FlightEditorMode>(isReadOnly ? "select" : "add");
    const [altDraft, setAltDraft] = useState<string | null>(null);
    const [showZones, setShowZones] = useState(false);
    const { data: zones = [] } = useAirspaceAll();
    const [flyToTarget, setFlyToTarget] = useState<{
        lat: number;
        lng: number;
        altitude?: number;
        key: number;
    } | null>(null);

    const activeZones = useMemo(
        () => zones.filter((z) => z.status === AIRSPACE_ZONE_STATUS.ACTIVE),
        [zones]
    );

    const allRoutePoints = useMemo(() => {
        const pts: { lat: number; lng: number }[] = [];
        if (
            departureHub?.location?.latitude !== undefined &&
            departureHub?.location?.longitude !== undefined
        ) {
            pts.push({ lat: departureHub.location.latitude, lng: departureHub.location.longitude });
        }
        waypoints.forEach((wp) => {
            pts.push({ lat: wp.latitude, lng: wp.longitude });
        });
        if (
            arrivalHub?.location?.latitude !== undefined &&
            arrivalHub?.location?.longitude !== undefined &&
            arrivalHub.id !== departureHub?.id
        ) {
            pts.push({ lat: arrivalHub.location.latitude, lng: arrivalHub.location.longitude });
        }
        return pts;
    }, [departureHub, arrivalHub, waypoints]);

    const handleAltChange = (val: string) => {
        setAltDraft(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0) {
            onCruisingAltitudeChange(parsed);
        }
    };

    const handleProfilePointClick = (point: ProfilePoint) => {
        if (point.waypoint) {
            onSelectWaypoint(point.waypoint as unknown as FlightWaypoint);
        }
        if (point.latitude !== undefined && point.longitude !== undefined) {
            setFlyToTarget({
                lat: point.latitude,
                lng: point.longitude,
                altitude: point.altitude,
                key: Date.now(),
            });
        }
    };

    return (
        <TacticalMapContainer
            className={className}
            header={
                <div className="px-4 py-2 border-b border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-2 bg-[var(--color-surface-panel)] z-10">
                    {isReadOnly ? (
                        <div className="inline-flex items-center h-[34px] gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>{t("readOnly")}</span>
                        </div>
                    ) : (
                        <div className="flex items-center h-[34px] gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
                            <button
                                type="button"
                                aria-pressed={mode === "select"}
                                onClick={() => setMode("select")}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    mode === "select"
                                        ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                )}
                                title={t("selectTooltip")}
                            >
                                <MousePointer className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("select")}</span>
                            </button>

                            <button
                                type="button"
                                aria-pressed={mode === "add"}
                                onClick={() => setMode("add")}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    mode === "add"
                                        ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                )}
                                title={t("addPointTooltip")}
                            >
                                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{t("addPoint")}</span>
                            </button>
                        </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                        {!isReadOnly && (
                            <>
                                <MapUndoClear
                                    onUndo={onUndoWaypoint}
                                    onClear={onClearWaypoints}
                                    disabled={waypoints.length === 0}
                                />

                                <div className="flex items-center h-[34px] gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-card)] px-2.5 py-1 rounded border border-[var(--color-border-default)]">
                                    <span className="text-[11px] font-mono uppercase text-[var(--color-text-muted)]">
                                        {t("altLabel")}
                                    </span>
                                    <input
                                        type="number"
                                        aria-label={t("cruisingAltAria")}
                                        min="10"
                                        max="1000"
                                        value={altDraft ?? String(cruisingAltitude)}
                                        onChange={(e) => handleAltChange(e.target.value)}
                                        onBlur={() => setAltDraft(null)}
                                        className="w-14 h-6 px-1 border border-[var(--color-border-default)] rounded text-center font-mono text-xs bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:border-[var(--color-border-dark)] focus-visible:ring-2 focus-visible:ring-slate-300"
                                    />
                                    <span className="font-mono text-slate-400 text-[11px]">m</span>
                                </div>
                            </>
                        )}

                        <MapZoneAction
                            active={showZones}
                            onToggle={() => setShowZones((prev) => !prev)}
                            count={activeZones.length}
                        />
                    </div>
                </div>
            }
            overlay={
                !isReadOnly && mode === "add" ? (
                    <div className="absolute bottom-3 left-3 z-20 bg-[var(--color-tactical-panel)] text-white text-[11px] font-mono px-3 py-1.5 chamfer-sm backdrop-blur-xs shadow-md flex items-center gap-2 pointer-events-none border border-[var(--color-tactical-border)]">
                        <Plus className="w-3.5 h-3.5 text-white" />
                        <span>{t("mapHint")}</span>
                    </div>
                ) : null
            }
            footer={
                <AltitudeProfile
                    waypoints={waypoints}
                    selectedWaypointId={selectedWaypointId}
                    departureHub={departureHub}
                    arrivalHub={arrivalHub}
                    airspaceZones={activeZones}
                    onWaypointClick={onSelectWaypoint}
                    onPointClick={handleProfilePointClick}
                />
            }
        >
            <FlightRouteRenderer
                departureHub={departureHub}
                arrivalHub={arrivalHub}
                waypoints={waypoints}
                selectedWaypointId={selectedWaypointId}
                cruisingAltitude={cruisingAltitude}
            />

            <FlightInteractionController
                mode={mode}
                cruisingAltitude={cruisingAltitude}
                waypoints={waypoints}
                isReadOnly={isReadOnly}
                onAddWaypoint={onAddWaypoint}
                onMoveWaypoint={onMoveWaypoint}
                onSelectWaypoint={onSelectWaypoint}
            />

            <FlightCameraController targetLocation={flyToTarget} routePoints={allRoutePoints} />

            {showZones && activeZones.length > 0 && <AirspaceLayer zones={activeZones} />}
        </TacticalMapContainer>
    );
}
