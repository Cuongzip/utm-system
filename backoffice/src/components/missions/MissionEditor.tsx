"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { SplitMapLayout, ChamferButton, OutlineButton, StatusBadge } from "@/components/ui";
import {
    MissionMapEditor,
    MissionFormSidebar,
    useMissionWaypoints,
    waypointsValidationSchema,
    sanitizeWaypointForApi,
    determineActiveTabFromErrors,
} from "@/components/missions";
import { createFieldErrorCleaner, validateSchema } from "@/utils";
import { createMissionBody, updateMissionBody } from "@/generated/mission";
import type {
    Hub,
    Drone,
    Mission,
    Waypoint,
    MissionScheduleType,
    CreateMissionPayload,
    UpdateMissionPayload,
} from "@/types";

export interface MissionSaveData {
    payload: CreateMissionPayload | UpdateMissionPayload;
    waypoints: Waypoint[];
    defaultAltitude: number;
    droneId?: string;
}

export interface MissionEditorProps {
    mode: "create" | "edit";
    initialData?: Mission | null;
    hubs?: Hub[];
    drones?: Drone[];
    onSave: (data: MissionSaveData) => Promise<void>;
    loading?: boolean;
}

export function MissionEditor({
    mode,
    initialData,
    hubs = [],
    drones = [],
    onSave,
    loading = false,
}: MissionEditorProps) {
    const router = useRouter();

    const [submitting, setSubmitting] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [droneId, setDroneId] = useState("");
    const [departureHubId, setDepartureHubId] = useState("");
    const [arrivalHubId, setArrivalHubId] = useState("");
    const [scheduleType, setScheduleType] = useState<MissionScheduleType>("immediate");
    const [scheduledAt, setScheduledAt] = useState("");

    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "waypoints" | "schedule">(
        "details"
    );
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = createFieldErrorCleaner(setFieldErrors);

    const isReadOnly = Boolean(
        mode === "edit" && initialData?.status && initialData.status.toLowerCase() !== "draft"
    );

    const onClearWaypointErrors = useCallback(() => {
        setFieldErrors((prev) => {
            const next = { ...prev };
            for (const k of Object.keys(next)) {
                if (k.startsWith("waypoints")) {
                    delete next[k];
                }
            }
            return next;
        });
    }, []);

    const selectedDepartureHub = useMemo(
        () => hubs.find((h) => h.id === departureHubId) || null,
        [hubs, departureHubId]
    );

    const selectedArrivalHub = useMemo(
        () => hubs.find((h) => h.id === (arrivalHubId || departureHubId)) || null,
        [hubs, arrivalHubId, departureHubId]
    );

    const {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        defaultAltitude,
        setDefaultAltitude,
        totalDistanceM,
        handleAddWaypoint,
        handleUpdateWaypoint,
        handleDeleteWaypoint,
        handleSelectWaypoint,
        handleMoveWaypoint,
        handleMoveWaypointOrder,
        handleGenerateHubToHub,
    } = useMissionWaypoints({
        isReadOnly,
        departureHub: selectedDepartureHub,
        arrivalHub: selectedArrivalHub,
        onClearWaypointErrors,
    });

    useEffect(() => {
        if (mode === "create" && hubs.length > 0) {
            setDepartureHubId((prev) => prev || hubs[0].id);
            if (hubs.length > 1) {
                setArrivalHubId((prev) => prev || hubs[1].id);
            }
        }
    }, [mode, hubs]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || "");
            setDescription(initialData.description || "");
            setDepartureHubId(initialData.departureHubId || "");
            setArrivalHubId(initialData.arrivalHubId || "");
            if (
                initialData.scheduleType === "immediate" ||
                initialData.scheduleType === "scheduled"
            ) {
                setScheduleType(initialData.scheduleType);
            }
            setScheduledAt(initialData.scheduledAt ? initialData.scheduledAt.slice(0, 16) : "");

            const loadedWaypoints: Waypoint[] = (initialData.waypoints || []).map((wp, idx) => ({
                ...wp,
                sequence: wp.sequence || idx + 1,
                tempId: wp.id || `wp-init-${idx}`,
                name: wp.name || "",
                latitude:
                    wp.latitude !== undefined && wp.latitude !== null ? Number(wp.latitude) : 0,
                longitude:
                    wp.longitude !== undefined && wp.longitude !== null ? Number(wp.longitude) : 0,
                altitude:
                    wp.altitude !== undefined && wp.altitude !== null
                        ? Number(wp.altitude)
                        : defaultAltitude,
                actions:
                    wp.actions &&
                    typeof wp.actions === "object" &&
                    Object.keys(wp.actions).length > 0
                        ? wp.actions
                        : undefined,
                conditions:
                    wp.conditions &&
                    typeof wp.conditions === "object" &&
                    Object.keys(wp.conditions).length > 0
                        ? wp.conditions
                        : undefined,
            }));
            setWaypoints(loadedWaypoints);
        }
    }, [initialData, defaultAltitude, setWaypoints]);

    const handleSave = async () => {
        if (isReadOnly) return;

        const scheduledIso =
            scheduleType === "scheduled" && scheduledAt
                ? new Date(scheduledAt).toISOString()
                : undefined;

        const payload = {
            name: name.trim(),
            description: description.trim() || undefined,
            departureHubId,
            arrivalHubId: arrivalHubId || departureHubId,
            scheduleType,
            scheduledAt: scheduledIso,
        };

        setFieldErrors({});

        const schema = mode === "create" ? createMissionBody : updateMissionBody;
        const validation = validateSchema(schema, payload);
        const newFieldErrors: Record<string, string> = {};

        const waypointValidation = validateSchema(waypointsValidationSchema, {
            waypoints: waypoints.map((w) => sanitizeWaypointForApi(w, defaultAltitude)),
        });

        if (!waypointValidation.success) {
            Object.assign(newFieldErrors, waypointValidation.errors);
        }

        if (!validation.success) {
            Object.assign(newFieldErrors, validation.errors);
        }

        if (!validation.success || Object.keys(newFieldErrors).length > 0) {
            setFieldErrors(newFieldErrors);
            const { tab, firstInvalidWaypointId } = determineActiveTabFromErrors(
                newFieldErrors,
                waypoints
            );
            setActiveSidebarTab(tab);
            if (firstInvalidWaypointId) {
                setSelectedWaypointId(firstInvalidWaypointId);
            }
            return;
        }

        setSubmitting(true);
        try {
            await onSave({
                payload: validation.data as CreateMissionPayload | UpdateMissionPayload,
                waypoints,
                defaultAltitude,
                droneId: droneId || undefined,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const pageTitle =
        mode === "create"
            ? "NEW MISSION"
            : isReadOnly
              ? `VIEW MISSION: ${initialData?.name || ""}`
              : `EDIT MISSION: ${initialData?.name || ""}`;

    return (
        <SplitMapLayout
            title={pageTitle}
            badges={
                mode === "edit" ? (
                    <StatusBadge status={initialData?.status || "draft"} showDot />
                ) : null
            }
            headerActions={
                <div className="flex items-center gap-3">
                    <OutlineButton
                        size="sm"
                        onClick={() => router.push("/dashboard/missions")}
                        disabled={submitting}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                        <span>Cancel</span>
                    </OutlineButton>

                    {!isReadOnly && (
                        <ChamferButton
                            variant="dark"
                            size="sm"
                            onClick={handleSave}
                            disabled={submitting || loading}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                <Save className="w-4 h-4 text-white" />
                            )}
                            <span>{mode === "create" ? "Save Mission" : "Update Mission"}</span>
                        </ChamferButton>
                    )}
                </div>
            }
            mapContent={
                <MissionMapEditor
                    waypoints={waypoints}
                    selectedWaypointId={selectedWaypointId}
                    defaultAltitude={defaultAltitude}
                    onDefaultAltitudeChange={setDefaultAltitude}
                    departureHub={selectedDepartureHub}
                    arrivalHub={selectedArrivalHub}
                    onAddWaypoint={handleAddWaypoint}
                    onMoveWaypoint={handleMoveWaypoint}
                    onSelectWaypoint={handleSelectWaypoint}
                    onGenerateHubToHub={handleGenerateHubToHub}
                    isReadOnly={isReadOnly}
                    className="h-full"
                />
            }
            sidebarContent={
                <MissionFormSidebar
                    name={name}
                    onNameChange={setName}
                    description={description}
                    onDescriptionChange={setDescription}
                    droneId={droneId}
                    onDroneIdChange={setDroneId}
                    departureHubId={departureHubId}
                    onDepartureHubIdChange={setDepartureHubId}
                    arrivalHubId={arrivalHubId}
                    onArrivalHubIdChange={setArrivalHubId}
                    scheduleType={scheduleType}
                    onScheduleTypeChange={setScheduleType}
                    scheduledAt={scheduledAt}
                    onScheduledAtChange={setScheduledAt}
                    drones={drones}
                    hubs={hubs}
                    waypoints={waypoints}
                    selectedWaypoint={selectedWaypoint}
                    onSelectWaypoint={handleSelectWaypoint}
                    onUpdateWaypoint={handleUpdateWaypoint}
                    onDeleteWaypoint={handleDeleteWaypoint}
                    onMoveWaypointOrder={handleMoveWaypointOrder}
                    activeTab={activeSidebarTab}
                    onTabChange={setActiveSidebarTab}
                    totalDistanceM={totalDistanceM}
                    isReadOnly={isReadOnly}
                    fieldErrors={fieldErrors}
                    onClearFieldError={clearFieldError}
                />
            }
        />
    );
}

export default MissionEditor;
