"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { SplitMapLayout, ChamferButton, StatusBadge } from "@/components/ui";
import {
    MissionMapEditor,
    MissionFormSidebar,
    useMissionWaypoints,
    waypointsValidationSchema,
    sanitizeWaypointForApi,
    determineActiveTabFromErrors,
} from "@/components/missions";
import { clearFieldError, validateSchema, parseApiError } from "@/utils";
import { createMissionBody, updateMissionBody } from "@/generated/mission";
import type {
    Hub,
    Drone,
    Mission,
    Waypoint,
    MissionFormPayload,
    CreateMissionPayload,
    UpdateMissionPayload,
} from "@/types";
import {
    getInitialMissionFormPayload,
    DEFAULT_MISSION_STATUS,
    MISSION_SCHEDULE_TYPE,
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
    const [droneId, setDroneId] = useState("");

    const [formData, setFormData] = useState<MissionFormPayload>(() =>
        getInitialMissionFormPayload(initialData)
    );

    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "waypoints" | "schedule">(
        "details"
    );
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const handleClearFieldError = (...fields: string[]) =>
        clearFieldError(setFieldErrors, ...fields);

    const isReadOnly = Boolean(
        mode === "edit" && initialData?.status && initialData.status.toLowerCase() !== "draft"
    );

    useEffect(() => {
        setFormData(getInitialMissionFormPayload(initialData));
    }, [initialData]);

    useEffect(() => {
        if (mode === "create" && hubs.length > 0) {
            setFormData((prev) => ({
                ...prev,
                departureHubId: prev.departureHubId || hubs[0].id,
                arrivalHubId: prev.arrivalHubId || (hubs.length > 1 ? hubs[1].id : hubs[0].id),
            }));
        }
    }, [mode, hubs]);

    const handleFormChange = <K extends keyof MissionFormPayload>(
        field: K,
        value: MissionFormPayload[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

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
        () => hubs.find((h) => h.id === formData.departureHubId) || null,
        [hubs, formData.departureHubId]
    );

    const selectedArrivalHub = useMemo(
        () => hubs.find((h) => h.id === (formData.arrivalHubId || formData.departureHubId)) || null,
        [hubs, formData.arrivalHubId, formData.departureHubId]
    );

    const {
        waypoints,
        setWaypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        defaultAltitude,
        setDefaultAltitude,
        handleAddWaypoint,
        handleUpdateWaypoint,
        handleDeleteWaypoint,
        handleSelectWaypoint,
        handleMoveWaypoint,
        handleMoveWaypointOrder,
        handleUndoWaypoint,
        handleClearWaypoints,
        handleGenerateHubToHub,
    } = useMissionWaypoints({
        initialWaypoints: initialData?.waypoints,
        initialAltitude: initialData?.waypoints?.[0]?.altitude ?? 50,
        isReadOnly,
        departureHub: selectedDepartureHub,
        arrivalHub: selectedArrivalHub,
        onClearWaypointErrors,
    });

    useEffect(() => {
        if (initialData) {
            const loadedWaypoints: Waypoint[] = (initialData.waypoints || []).map((wp, idx) => ({
                ...wp,
                sequence: wp.sequence ?? idx + 1,
                tempId: wp.id || `wp-init-${idx}`,
                name: wp.name || "",
                latitude: wp.latitude ?? 0,
                longitude: wp.longitude ?? 0,
                altitude: wp.altitude ?? defaultAltitude,
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
            formData.scheduleType === MISSION_SCHEDULE_TYPE.SCHEDULED && formData.scheduledAt
                ? new Date(formData.scheduledAt).toISOString()
                : undefined;

        const payload = {
            ...(mode === "create" ? { code: formData.code?.toUpperCase() } : {}),
            name: (formData.name || "").trim(),
            description: formData.description?.trim() || undefined,
            departureHubId: formData.departureHubId,
            arrivalHubId: formData.arrivalHubId || formData.departureHubId,
            scheduleType: formData.scheduleType,
            scheduledAt: scheduledIso,
        };

        setFieldErrors({});

        const schema = mode === "create" ? createMissionBody : updateMissionBody;
        const validation = validateSchema(schema, payload);
        const newFieldErrors: Record<string, string> = {};

        if (formData.scheduleType === MISSION_SCHEDULE_TYPE.SCHEDULED) {
            if (!formData.scheduledAt || !formData.scheduledAt.trim()) {
                newFieldErrors.scheduledAt = "Scheduled departure time is required";
            } else if (new Date(formData.scheduledAt).getTime() <= Date.now()) {
                newFieldErrors.scheduledAt = "Scheduled departure time must be in the future";
            }
        }

        const waypointValidation = validateSchema(waypointsValidationSchema, {
            waypoints: waypoints.map((w) => sanitizeWaypointForApi(w, defaultAltitude)),
        });

        if (
            !waypointValidation.success ||
            !validation.success ||
            Object.keys(newFieldErrors).length > 0
        ) {
            if (!waypointValidation.success) {
                Object.assign(newFieldErrors, waypointValidation.errors);
            }
            if (!validation.success) {
                Object.assign(newFieldErrors, validation.errors);
            }
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
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save mission");
            if (parsed.fieldErrors && Object.keys(parsed.fieldErrors).length > 0) {
                setFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }));
                const { tab, firstInvalidWaypointId } = determineActiveTabFromErrors(
                    parsed.fieldErrors,
                    waypoints
                );
                setActiveSidebarTab(tab);
                if (firstInvalidWaypointId) {
                    setSelectedWaypointId(firstInvalidWaypointId);
                }
            }
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
                    <StatusBadge status={initialData?.status ?? DEFAULT_MISSION_STATUS} showDot />
                ) : null
            }
            headerActions={
                <div className="flex items-center gap-3">
                    <ChamferButton
                        variant="outline"
                        size="sm"
                        clip="xs"
                        onClick={() => router.push("/dashboard/missions")}
                        disabled={submitting}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                        <span>Cancel</span>
                    </ChamferButton>

                    {!isReadOnly && (
                        <ChamferButton
                            variant="dark"
                            size="sm"
                            clip="sm"
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
                    onUndoWaypoint={handleUndoWaypoint}
                    onClearWaypoints={handleClearWaypoints}
                    onGenerateHubToHub={handleGenerateHubToHub}
                    isReadOnly={isReadOnly}
                    className="h-full"
                />
            }
            sidebarContent={
                <MissionFormSidebar
                    formData={formData}
                    onFormChange={handleFormChange}
                    droneId={droneId}
                    onDroneIdChange={setDroneId}
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
                    isEdit={mode === "edit"}
                    isReadOnly={isReadOnly}
                    fieldErrors={fieldErrors}
                    onClearFieldError={handleClearFieldError}
                />
            }
        />
    );
}
