"use client";

import { useEffect, useState, useMemo } from "react";
import { MousePointer, Plus, Pencil, Route, Compass } from "lucide-react";
import {
    TacticalMapContainer,
    MissionLayer,
    AirspaceLayer,
    AltitudeProfile,
    MapUndoClear,
    MapZoneAction,
} from "@/components/map";
import { useAirspaceAll } from "@/hooks";
import { cn } from "@/lib";
import type { Waypoint, Hub, ProfilePoint } from "@/types";
import { MissionInteractionController, type EditorMode } from "./MissionInteractionController";
import { MissionCameraController } from "./MissionCameraController";

export interface MissionMapEditorProps {
    waypoints: Waypoint[];
    selectedWaypointId?: string | null;
    defaultAltitude?: number;
    onDefaultAltitudeChange: (alt: number) => void;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    onAddWaypoint: (lat: number, lng: number, altitude: number) => void;
    onMoveWaypoint: (wpId: string, lat: number, lng: number) => void;
    onSelectWaypoint: (waypoint: Waypoint | null) => void;
    onUndoWaypoint: () => void;
    onClearWaypoints: () => void;
    onGenerateHubToHub: () => void;
    isReadOnly?: boolean;
    className?: string;
}

export function MissionMapEditor({
    waypoints = [],
    selectedWaypointId,
    defaultAltitude = 50,
    onDefaultAltitudeChange,
    departureHub,
    arrivalHub,
    onAddWaypoint,
    onMoveWaypoint,
    onSelectWaypoint,
    onUndoWaypoint,
    onClearWaypoints,
    onGenerateHubToHub,
    isReadOnly = false,
    className = "",
}: MissionMapEditorProps) {
    const [mode, setMode] = useState<EditorMode>(isReadOnly ? "select" : "add");
    const [altInput, setAltInput] = useState(String(defaultAltitude));
    const [showZones, setShowZones] = useState(false);
    const { data: zones = [] } = useAirspaceAll();
    const [flyToTarget, setFlyToTarget] = useState<{
        lat: number;
        lng: number;
        altitude?: number;
        key: number;
    } | null>(null);

    useEffect(() => {
        setAltInput(String(defaultAltitude));
    }, [defaultAltitude]);

    const allMissionPoints = useMemo(() => {
        const pts: { lat: number; lng: number }[] = [];
        if (
            departureHub?.location?.latitude !== undefined &&
            departureHub?.location?.longitude !== undefined
        ) {
            pts.push({ lat: departureHub.location.latitude, lng: departureHub.location.longitude });
        }
        waypoints.forEach((wp) => {
            if (typeof wp.latitude === "number" && typeof wp.longitude === "number") {
                pts.push({ lat: wp.latitude, lng: wp.longitude });
            }
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

    const handleProfilePointClick = (point: ProfilePoint) => {
        if (point.waypoint) {
            onSelectWaypoint(point.waypoint);
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

    const handleAltChange = (val: string) => {
        setAltInput(val);
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && parsed > 0) {
            onDefaultAltitudeChange(parsed);
        }
    };

    return (
        <TacticalMapContainer
            className={className}
            header={
                <div className="px-[18px] py-2.5 border-b border-[var(--color-border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--color-surface-panel)] z-10">
                    {isReadOnly ? (
                        <div className="inline-flex items-center h-[34px] gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>READ-ONLY VIEW</span>
                        </div>
                    ) : (
                        <div className="flex items-center h-[34px] gap-1 bg-[var(--color-surface-card)] p-1 rounded border border-[var(--color-border-default)]">
                            <button
                                type="button"
                                onClick={() => setMode("select")}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                    mode === "select"
                                        ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                )}
                                title="Select or drag waypoints"
                            >
                                <MousePointer className="w-3.5 h-3.5" />
                                <span>Select</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode("add")}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                    mode === "add"
                                        ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                )}
                                title="Click on map to add waypoint"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Point</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setMode("draw")}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer",
                                    mode === "draw"
                                        ? "bg-[var(--color-border-dark)] text-white shadow-2xs"
                                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                )}
                                title="Draw continuous path"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Draw Path</span>
                            </button>

                            <button
                                type="button"
                                onClick={onGenerateHubToHub}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                                title="Auto connect Departure Vertiport to Arrival Vertiport"
                            >
                                <Route className="w-3.5 h-3.5 text-slate-500" />
                                <span>Hub-to-Hub</span>
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {!isReadOnly && (
                            <>
                                <MapUndoClear
                                    onUndo={onUndoWaypoint}
                                    onClear={onClearWaypoints}
                                    disabled={waypoints.length === 0}
                                />

                                <div className="flex items-center h-[34px] gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-card)] px-2.5 py-1 rounded border border-[var(--color-border-default)]">
                                    <span className="text-[11px] font-mono uppercase text-[var(--color-text-muted)]">
                                        Alt:
                                    </span>
                                    <input
                                        type="number"
                                        min="5"
                                        max="500"
                                        value={altInput}
                                        onChange={(e) => handleAltChange(e.target.value)}
                                        className="w-12 h-6 px-1 border border-[var(--color-border-default)] rounded text-center font-mono text-xs bg-[var(--color-surface-panel)] text-[var(--color-text-primary)] focus:outline-hidden focus:border-[var(--color-border-dark)]"
                                    />
                                    <span className="font-mono text-slate-400 text-[11px]">m</span>
                                </div>
                            </>
                        )}

                        <MapZoneAction
                            active={showZones}
                            onToggle={() => setShowZones((prev) => !prev)}
                            count={zones.length}
                        />
                    </div>
                </div>
            }
            overlay={
                isReadOnly ? (
                    <div className="absolute top-3 left-3 z-20 bg-[var(--color-tactical-panel)] text-white text-[11px] font-mono px-3 py-1.5 rounded backdrop-blur-xs shadow-md flex items-center gap-2 pointer-events-none border border-[var(--color-tactical-border)]">
                        <Compass className="w-3.5 h-3.5 text-[var(--color-tech-amber)]" />
                        <span>Click waypoint to inspect parameters</span>
                    </div>
                ) : (
                    (mode === "add" || mode === "draw") && (
                        <div className="absolute top-3 left-3 z-20 bg-[var(--color-tactical-panel)] text-white text-[11px] font-mono px-3 py-1.5 rounded backdrop-blur-xs shadow-md flex items-center gap-2 pointer-events-none border border-[var(--color-tactical-border)]">
                            <Plus className="w-3.5 h-3.5 text-white animate-pulse" />
                            <span>Click to add • Drag point to move</span>
                        </div>
                    )
                )
            }
            footer={
                <AltitudeProfile
                    waypoints={waypoints}
                    selectedWaypointId={selectedWaypointId}
                    departureHub={departureHub}
                    arrivalHub={arrivalHub}
                    onWaypointClick={onSelectWaypoint}
                    onPointClick={handleProfilePointClick}
                />
            }
        >
            <MissionLayer
                waypoints={waypoints}
                selectedWaypointId={selectedWaypointId}
                departureHub={departureHub}
                arrivalHub={arrivalHub}
                autoFitBounds={false}
            />

            <MissionInteractionController
                mode={mode}
                defaultAltitude={defaultAltitude}
                waypoints={waypoints}
                isReadOnly={isReadOnly}
                onAddWaypoint={onAddWaypoint}
                onMoveWaypoint={onMoveWaypoint}
                onSelectWaypoint={onSelectWaypoint}
            />

            <MissionCameraController
                targetLocation={flyToTarget}
                missionPoints={allMissionPoints}
            />

            {showZones && zones.length > 0 && <AirspaceLayer zones={zones} autoFitBounds={false} />}
        </TacticalMapContainer>
    );
}
