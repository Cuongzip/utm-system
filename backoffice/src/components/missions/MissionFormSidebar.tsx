"use client";

import { useState } from "react";
import {
    Clock,
    Play,
    Trash2,
    ShieldCheck,
    AlertCircle,
    Sliders,
    ChevronUp,
    ChevronDown,
    X,
} from "lucide-react";
import { ChamferCard, CustomSelect, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import type { Waypoint, Drone, Hub, MissionScheduleType } from "@/types";

interface MissionFormSidebarProps {
    name: string;
    onNameChange: (val: string) => void;
    description: string;
    onDescriptionChange: (val: string) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    departureHubId: string;
    onDepartureHubIdChange: (val: string) => void;
    arrivalHubId: string;
    onArrivalHubIdChange: (val: string) => void;
    scheduleType: MissionScheduleType;
    onScheduleTypeChange: (val: MissionScheduleType) => void;
    scheduledAt: string;
    onScheduledAtChange: (val: string) => void;
    drones: Drone[];
    hubs: Hub[];
    waypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    onSelectWaypoint: (wp: Waypoint | null) => void;
    onUpdateWaypoint: (wp: Waypoint) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder?: (fromIndex: number, toIndex: number) => void;
    activeTab: "details" | "waypoints" | "schedule";
    onTabChange: (tab: "details" | "waypoints" | "schedule") => void;
    totalDistanceM: number;
    isReadOnly?: boolean;
    className?: string;
}

export function MissionFormSidebar({
    name,
    onNameChange,
    description,
    onDescriptionChange,
    droneId,
    onDroneIdChange,
    departureHubId,
    onDepartureHubIdChange,
    arrivalHubId,
    onArrivalHubIdChange,
    scheduleType,
    onScheduleTypeChange,
    scheduledAt,
    onScheduledAtChange,
    drones = [],
    hubs = [],
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    activeTab,
    onTabChange,
    totalDistanceM,
    isReadOnly = false,
    className = "",
}: MissionFormSidebarProps) {
    const [waypointSubTab, setWaypointSubTab] = useState<"position" | "actions" | "conditions">(
        "position"
    );

    const isFeasible = Boolean(departureHubId && waypoints.length >= 2);
    const estimatedMinutes = totalDistanceM > 0 ? Math.ceil(totalDistanceM / 1000 / 0.5) : 0;
    const estimatedBatteryPct = Math.min(100, Math.ceil((totalDistanceM / 1000) * 4));

    const droneOptions: SelectOption[] = [
        { value: "", label: "No drone assigned" },
        ...drones.map((d) => ({
            value: d.id,
            label: `${d.model || d.registrationNumber || d.id} (${d.status || "available"})`,
        })),
    ];

    const hubOptions: SelectOption[] = hubs.map((h) => ({
        value: h.id,
        label: `${h.name}${h.code ? ` (${h.code})` : ""}`,
    }));

    const arrivalHubOptions: SelectOption[] = [
        { value: "", label: "Same as departure" },
        ...hubOptions,
    ];

    return (
        <ChamferCard size="lg" accent="dark" className={cn("w-full h-full", className)}>
            <div className="flex flex-col h-full bg-[var(--color-surface-panel)] select-none overflow-hidden">
                <div className="px-[18px] py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-surface-panel)] z-10">
                    <div className="text-[13px] font-bold text-[var(--color-text-primary)] flex items-center gap-2 tracking-[-0.2px]">
                        <Sliders className="w-4 h-4 text-[var(--color-border-dark)]" />
                        <span>MISSION PARAMETERS</span>
                    </div>
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] border border-[var(--color-border-default)]">
                        {waypoints.length} {waypoints.length === 1 ? "POINT" : "POINTS"}
                    </span>
                </div>

                <div className="grid grid-cols-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-panel)] text-xs">
                    <button
                        type="button"
                        onClick={() => onTabChange("details")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide",
                            activeTab === "details"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                        )}
                    >
                        Details
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("waypoints")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide",
                            activeTab === "waypoints"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                        )}
                    >
                        Waypoints {waypoints.length > 0 && `(${waypoints.length})`}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("schedule")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide",
                            activeTab === "schedule"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                        )}
                    >
                        Schedule
                    </button>
                </div>

                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    {activeTab === "details" && (
                        <div className="space-y-4">
                            <div className="form-group">
                                <label className="form-label">
                                    Mission Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter mission name"
                                    value={name}
                                    disabled={isReadOnly}
                                    onChange={(e) => onNameChange(e.target.value)}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    rows={3}
                                    placeholder="Optional description"
                                    value={description}
                                    disabled={isReadOnly}
                                    onChange={(e) => onDescriptionChange(e.target.value)}
                                    className="form-input resize-none"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Assigned Drone</label>
                                <CustomSelect
                                    value={droneId}
                                    disabled={isReadOnly}
                                    onValueChange={onDroneIdChange}
                                    options={droneOptions}
                                    placeholder="Select drone"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Departure Vertiport <span className="text-red-500">*</span>
                                </label>
                                <CustomSelect
                                    value={departureHubId}
                                    disabled={isReadOnly}
                                    onValueChange={onDepartureHubIdChange}
                                    options={hubOptions}
                                    placeholder="Select departure hub"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Arrival Vertiport</label>
                                <CustomSelect
                                    value={arrivalHubId}
                                    disabled={isReadOnly}
                                    onValueChange={onArrivalHubIdChange}
                                    options={arrivalHubOptions}
                                    placeholder="Same as departure"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="form-label mb-1.5 block">
                                    Mission Feasibility
                                </label>
                                <div className="p-3.5 border border-dashed border-[var(--color-border-default)] rounded-md bg-[var(--color-surface-card)]/60 text-xs text-[var(--color-text-secondary)]">
                                    {!isFeasible ? (
                                        <div className="flex items-start gap-2 text-[var(--color-text-muted)]">
                                            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                            <span>
                                                Select departure vertiport and draw at least 2
                                                waypoints on the map to verify route feasibility.
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs font-mono">
                                                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                    ROUTE FEASIBLE
                                                </span>
                                                <span className="text-[var(--color-text-primary)] font-bold">
                                                    {(totalDistanceM / 1000).toFixed(1)} km
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--color-border-default)] text-[11px] font-mono">
                                                <div>
                                                    <span className="text-[var(--color-text-muted)]">
                                                        Est. Flight:
                                                    </span>{" "}
                                                    <span className="text-[var(--color-text-primary)] font-semibold">
                                                        ~{estimatedMinutes} mins
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[var(--color-text-muted)]">
                                                        Est. Battery:
                                                    </span>{" "}
                                                    <span className="text-[var(--color-text-primary)] font-semibold">
                                                        ~{estimatedBatteryPct}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "waypoints" && (
                        <div className="space-y-4">
                            {selectedWaypoint ? (
                                <div className="space-y-3.5">
                                    <div className="flex items-center justify-between border-b border-[var(--color-border-default)] pb-2.5">
                                        <span className="text-xs font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                                            Edit Waypoint #{selectedWaypoint.sequence}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => onSelectWaypoint(null)}
                                                className="px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] rounded hover:bg-[var(--color-surface-card)] cursor-pointer flex items-center gap-1"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                <span>Close</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 bg-[var(--color-surface-card)] p-1 rounded-md text-[11px] font-semibold text-center border border-[var(--color-border-default)]">
                                        <button
                                            type="button"
                                            onClick={() => setWaypointSubTab("position")}
                                            className={cn(
                                                "py-1 rounded transition-colors cursor-pointer",
                                                waypointSubTab === "position"
                                                    ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                            )}
                                        >
                                            Position
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWaypointSubTab("actions")}
                                            className={cn(
                                                "py-1 rounded transition-colors cursor-pointer",
                                                waypointSubTab === "actions"
                                                    ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                            )}
                                        >
                                            Actions
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWaypointSubTab("conditions")}
                                            className={cn(
                                                "py-1 rounded transition-colors cursor-pointer",
                                                waypointSubTab === "conditions"
                                                    ? "bg-[var(--color-surface-panel)] shadow-2xs text-[var(--color-text-primary)] font-bold"
                                                    : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                                            )}
                                        >
                                            Conditions
                                        </button>
                                    </div>

                                    {waypointSubTab === "position" && (
                                        <div className="space-y-3 pt-1">
                                            <div className="form-group">
                                                <label className="form-label">Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Optional waypoint name"
                                                    value={selectedWaypoint.name || ""}
                                                    disabled={isReadOnly}
                                                    onChange={(e) =>
                                                        onUpdateWaypoint({
                                                            ...selectedWaypoint,
                                                            name: e.target.value,
                                                        })
                                                    }
                                                    className="form-input"
                                                />
                                            </div>

                                            <div className="form-row-2">
                                                <div className="form-group">
                                                    <label className="form-label">Latitude</label>
                                                    <input
                                                        type="number"
                                                        step="0.000001"
                                                        value={selectedWaypoint.latitude}
                                                        disabled={isReadOnly}
                                                        onChange={(e) =>
                                                            onUpdateWaypoint({
                                                                ...selectedWaypoint,
                                                                latitude:
                                                                    parseFloat(e.target.value) || 0,
                                                            })
                                                        }
                                                        className="form-input font-mono"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">Longitude</label>
                                                    <input
                                                        type="number"
                                                        step="0.000001"
                                                        value={selectedWaypoint.longitude}
                                                        disabled={isReadOnly}
                                                        onChange={(e) =>
                                                            onUpdateWaypoint({
                                                                ...selectedWaypoint,
                                                                longitude:
                                                                    parseFloat(e.target.value) || 0,
                                                            })
                                                        }
                                                        className="form-input font-mono"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row-2">
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        Altitude (m)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={selectedWaypoint.altitude || 50}
                                                        disabled={isReadOnly}
                                                        onChange={(e) =>
                                                            onUpdateWaypoint({
                                                                ...selectedWaypoint,
                                                                altitude:
                                                                    parseFloat(e.target.value) ||
                                                                    50,
                                                            })
                                                        }
                                                        className="form-input font-mono"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        Speed (m/s)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        placeholder="Default"
                                                        value={
                                                            selectedWaypoint.conditions?.speed || ""
                                                        }
                                                        disabled={isReadOnly}
                                                        onChange={(e) =>
                                                            onUpdateWaypoint({
                                                                ...selectedWaypoint,
                                                                conditions: {
                                                                    ...selectedWaypoint.conditions,
                                                                    speed:
                                                                        parseFloat(
                                                                            e.target.value
                                                                        ) || undefined,
                                                                },
                                                            })
                                                        }
                                                        className="form-input font-mono"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-row-2">
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        Heading (°)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Auto"
                                                        value={String(
                                                            selectedWaypoint.conditions?.heading ||
                                                                ""
                                                        )}
                                                        disabled={isReadOnly}
                                                        onChange={(e) =>
                                                            onUpdateWaypoint({
                                                                ...selectedWaypoint,
                                                                conditions: {
                                                                    ...selectedWaypoint.conditions,
                                                                    heading:
                                                                        e.target.value || undefined,
                                                                },
                                                            })
                                                        }
                                                        className="form-input font-mono"
                                                    />
                                                </div>
                                                <div className="form-group">
                                                    <label className="form-label">
                                                        Turn Radius (m)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        placeholder="Default"
                                                        value={
                                                            selectedWaypoint.conditions
                                                                ?.turnRadius || ""
                                                        }
                                                        disabled={isReadOnly}
                                                        onChange={(e) =>
                                                            onUpdateWaypoint({
                                                                ...selectedWaypoint,
                                                                conditions: {
                                                                    ...selectedWaypoint.conditions,
                                                                    turnRadius:
                                                                        parseFloat(
                                                                            e.target.value
                                                                        ) || undefined,
                                                                },
                                                            })
                                                        }
                                                        className="form-input font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {waypointSubTab === "actions" && (
                                        <div className="space-y-3 pt-1">
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Hover Duration (s)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="3600"
                                                    placeholder="0"
                                                    value={
                                                        selectedWaypoint.actions?.hoverDurationS ||
                                                        ""
                                                    }
                                                    disabled={isReadOnly}
                                                    onChange={(e) =>
                                                        onUpdateWaypoint({
                                                            ...selectedWaypoint,
                                                            actions: {
                                                                ...selectedWaypoint.actions,
                                                                hoverDurationS:
                                                                    parseFloat(e.target.value) ||
                                                                    undefined,
                                                            },
                                                        })
                                                    }
                                                    className="form-input font-mono"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 pt-1">
                                                <input
                                                    type="checkbox"
                                                    id="waitConfirmation"
                                                    checked={Boolean(
                                                        selectedWaypoint.actions
                                                            ?.waitForConfirmation
                                                    )}
                                                    disabled={isReadOnly}
                                                    onChange={(e) =>
                                                        onUpdateWaypoint({
                                                            ...selectedWaypoint,
                                                            actions: {
                                                                ...selectedWaypoint.actions,
                                                                waitForConfirmation:
                                                                    e.target.checked,
                                                            },
                                                        })
                                                    }
                                                    className="rounded border-[var(--color-border-default)] cursor-pointer"
                                                />
                                                <label
                                                    htmlFor="waitConfirmation"
                                                    className="text-xs text-[var(--color-text-primary)] cursor-pointer font-medium"
                                                >
                                                    Wait for ATC confirmation before proceed
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {waypointSubTab === "conditions" && (
                                        <div className="space-y-3 pt-1">
                                            <div className="form-group">
                                                <label className="form-label">
                                                    Max Wind Tolerance (m/s)
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 15"
                                                    value={
                                                        selectedWaypoint.conditions?.maxWindSpeed ||
                                                        ""
                                                    }
                                                    disabled={isReadOnly}
                                                    onChange={(e) =>
                                                        onUpdateWaypoint({
                                                            ...selectedWaypoint,
                                                            conditions: {
                                                                ...selectedWaypoint.conditions,
                                                                maxWindSpeed:
                                                                    parseFloat(e.target.value) ||
                                                                    undefined,
                                                            },
                                                        })
                                                    }
                                                    className="form-input font-mono"
                                                />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">
                                                    Min Visibility (m)
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="e.g. 5000"
                                                    value={
                                                        selectedWaypoint.conditions
                                                            ?.minVisibility || ""
                                                    }
                                                    disabled={isReadOnly}
                                                    onChange={(e) =>
                                                        onUpdateWaypoint({
                                                            ...selectedWaypoint,
                                                            conditions: {
                                                                ...selectedWaypoint.conditions,
                                                                minVisibility:
                                                                    parseFloat(e.target.value) ||
                                                                    undefined,
                                                            },
                                                        })
                                                    }
                                                    className="form-input font-mono"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="text-xs text-[var(--color-text-secondary)] mb-2 font-medium">
                                        Click a waypoint to edit details, drag on map or use arrows
                                        to move.
                                    </div>
                                    {waypoints.length === 0 ? (
                                        <div className="p-6 border border-dashed border-[var(--color-border-default)] rounded-md text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-card)]/40">
                                            No waypoints defined yet. Use the map toolbar to add
                                            points.
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                                            {waypoints.map((wp, idx) => (
                                                <div
                                                    key={wp.id || wp.tempId || idx}
                                                    onClick={() => onSelectWaypoint(wp)}
                                                    className="flex items-center justify-between p-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)] hover:shadow-2xs cursor-pointer transition-all"
                                                >
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="w-5 h-5 rounded-full bg-[var(--color-border-dark)] text-white font-mono text-[10px] flex items-center justify-center font-bold">
                                                            {wp.sequence}
                                                        </span>
                                                        <div className="text-xs font-mono">
                                                            <span className="font-semibold text-[var(--color-text-primary)]">
                                                                {wp.name || `Point ${wp.sequence}`}
                                                            </span>
                                                            <span className="text-[var(--color-text-muted)] ml-2 text-[11px]">
                                                                Alt: {wp.altitude || 50}m
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {!isReadOnly && (
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onMoveWaypointOrder?.(
                                                                        idx,
                                                                        idx - 1
                                                                    );
                                                                }}
                                                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
                                                                title="Move point up"
                                                            >
                                                                <ChevronUp className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    idx === waypoints.length - 1
                                                                }
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onMoveWaypointOrder?.(
                                                                        idx,
                                                                        idx + 1
                                                                    );
                                                                }}
                                                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-card)] disabled:opacity-20 disabled:pointer-events-none cursor-pointer transition-colors"
                                                                title="Move point down"
                                                            >
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onDeleteWaypoint(
                                                                        String(wp.id || wp.tempId)
                                                                    );
                                                                }}
                                                                className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 cursor-pointer transition-colors"
                                                                title="Delete point"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "schedule" && (
                        <div className="space-y-4">
                            <label className="form-label block">Schedule Type</label>

                            <div
                                onClick={() => !isReadOnly && onScheduleTypeChange("immediate")}
                                className={cn(
                                    "p-4 rounded-md border transition-all flex items-start gap-3.5",
                                    isReadOnly ? "cursor-default opacity-80" : "cursor-pointer",
                                    scheduleType === "immediate"
                                        ? "border-[var(--color-tech-cyan)] bg-[var(--color-tech-cyan-light)] shadow-xs"
                                        : "border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)]"
                                )}
                            >
                                <div className="w-8 h-8 rounded bg-[var(--color-tech-cyan)]/15 text-[var(--color-tech-cyan)] flex items-center justify-center shrink-0">
                                    <Play className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <span className="font-semibold text-xs text-[var(--color-text-primary)] block">
                                        Immediate / Manual Start
                                    </span>
                                    <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed block mt-0.5">
                                        Execute mission immediately or launch manually when ready
                                    </span>
                                </div>
                            </div>

                            <div
                                onClick={() => !isReadOnly && onScheduleTypeChange("scheduled")}
                                className={cn(
                                    "p-4 rounded-md border transition-all flex flex-col gap-3",
                                    isReadOnly ? "cursor-default opacity-80" : "cursor-pointer",
                                    scheduleType === "scheduled"
                                        ? "border-[var(--color-tech-amber)] bg-[var(--color-tech-amber-light)] shadow-xs"
                                        : "border-[var(--color-border-default)] bg-[var(--color-surface-panel)] hover:border-[var(--color-border-strong)]"
                                )}
                            >
                                <div className="flex items-start gap-3.5">
                                    <div className="w-8 h-8 rounded bg-[var(--color-tech-amber)]/20 text-[var(--color-tech-amber-hover)] flex items-center justify-center shrink-0">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-semibold text-xs text-[var(--color-text-primary)] block">
                                            Scheduled Departure
                                        </span>
                                        <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed block mt-0.5">
                                            Start at a specific planned date and time
                                        </span>
                                    </div>
                                </div>

                                {scheduleType === "scheduled" && (
                                    <div
                                        className="pt-2 border-t border-[var(--color-border-default)]"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <label className="form-label block text-[11px] font-mono text-[var(--color-text-muted)] mb-1">
                                            DEPARTURE DATE & TIME
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={scheduledAt}
                                            disabled={isReadOnly}
                                            onChange={(e) => onScheduledAtChange(e.target.value)}
                                            className="form-input font-mono"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}

export default MissionFormSidebar;
