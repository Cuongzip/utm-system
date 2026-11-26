"use client";

import { ChamferCard, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import {
    DEFAULT_DRONE_STATUS,
    type Waypoint,
    type Drone,
    type Hub,
    type MissionFormPayload,
} from "@/types";
import { MissionDetailsTab } from "./MissionDetailsTab";
import { MissionWaypointsTab } from "./MissionWaypointsTab";
import { MissionScheduleTab } from "./MissionScheduleTab";

export interface MissionFormSidebarProps {
    missionId?: string;
    formData: MissionFormPayload;
    onFormChange: <K extends keyof MissionFormPayload>(
        field: K,
        value: MissionFormPayload[K]
    ) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    drones: Drone[];
    hubs: Hub[];
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    waypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    onSelectWaypoint: (wp: Waypoint | null) => void;
    onAddHubWaypoint: (hub: Hub) => void;
    onUpdateWaypoint: (wp: Waypoint) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    activeTab: "details" | "waypoints" | "schedule";
    onTabChange: (tab: "details" | "waypoints" | "schedule") => void;
    isEdit: boolean;
    isReadOnly: boolean;
    onAutoPlanHubs?: () => void;
    isAutoPlanning?: boolean;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

export function MissionFormSidebar({
    missionId,
    formData,
    onFormChange,
    droneId,
    onDroneIdChange,
    drones = [],
    hubs = [],
    departureHub,
    arrivalHub,
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onAddHubWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    activeTab,
    onTabChange,
    isEdit = false,
    isReadOnly = false,
    onAutoPlanHubs,
    isAutoPlanning = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionFormSidebarProps) {
    const hasWaypointErrors = Boolean(
        fieldErrors.waypoints || Object.keys(fieldErrors).some((k) => k.startsWith("waypoints."))
    );

    const droneOptions: SelectOption[] = [
        { value: "", label: "No drone assigned" },
        ...drones.map((d) => ({
            value: d.id,
            label: `${d.model || d.registrationNumber || d.id} (${d.status ?? DEFAULT_DRONE_STATUS})`,
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

    const totalPoints = waypoints.length + (departureHub ? 1 : 0) + (arrivalHub ? 1 : 0);

    return (
        <ChamferCard size="lg" className="w-full h-full min-h-0">
            <div className="flex flex-col h-full min-h-0 bg-[var(--color-surface-panel)] select-none overflow-hidden">
                <div className="grid grid-cols-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-panel)] text-xs shrink-0">
                    <button
                        type="button"
                        onClick={() => onTabChange("details")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "details"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            (fieldErrors.code ||
                                fieldErrors.name ||
                                fieldErrors.departureHubId ||
                                fieldErrors.arrivalHubId) &&
                                "text-red-600"
                        )}
                    >
                        <span>Details</span>
                        {(fieldErrors.code ||
                            fieldErrors.name ||
                            fieldErrors.departureHubId ||
                            fieldErrors.arrivalHubId) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("waypoints")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "waypoints"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            hasWaypointErrors && "text-red-600"
                        )}
                    >
                        <span>Waypoints {totalPoints > 0 && `(${totalPoints})`}</span>
                        {hasWaypointErrors && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange("schedule")}
                        className={cn(
                            "py-3 text-center border-b-2 transition-colors cursor-pointer text-xs font-bold tracking-wide flex items-center justify-center gap-1.5",
                            activeTab === "schedule"
                                ? "border-[var(--color-border-dark)] text-[var(--color-text-primary)] bg-[var(--color-surface-card)]/50"
                                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                            fieldErrors.scheduledAt && "text-red-600"
                        )}
                    >
                        <span>Schedule</span>
                        {fieldErrors.scheduledAt && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                    </button>
                </div>

                <div className="flex-1 min-h-0 p-5 overflow-y-auto space-y-4">
                    {activeTab === "details" && (
                        <MissionDetailsTab
                            missionId={missionId}
                            formData={formData}
                            onFormChange={onFormChange}
                            droneId={droneId}
                            onDroneIdChange={onDroneIdChange}
                            droneOptions={droneOptions}
                            hubOptions={hubOptions}
                            arrivalHubOptions={arrivalHubOptions}
                            isEdit={isEdit}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}

                    {activeTab === "waypoints" && (
                        <MissionWaypointsTab
                            waypoints={waypoints}
                            selectedWaypoint={selectedWaypoint}
                            onSelectWaypoint={onSelectWaypoint}
                            onAddHubWaypoint={onAddHubWaypoint}
                            onUpdateWaypoint={onUpdateWaypoint}
                            onDeleteWaypoint={onDeleteWaypoint}
                            onMoveWaypointOrder={onMoveWaypointOrder}
                            departureHub={departureHub}
                            arrivalHub={arrivalHub}
                            hubs={hubs}
                            isReadOnly={isReadOnly}
                            onAutoPlanHubs={onAutoPlanHubs}
                            isAutoPlanning={isAutoPlanning}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}

                    {activeTab === "schedule" && (
                        <MissionScheduleTab
                            formData={formData}
                            onFormChange={onFormChange}
                            isReadOnly={isReadOnly}
                            fieldErrors={fieldErrors}
                            onClearFieldError={onClearFieldError}
                        />
                    )}
                </div>
            </div>
        </ChamferCard>
    );
}
