"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    ChamferButton,
    OutlineButton,
    AlertBanner,
    PageHeader,
    StatusBadge,
} from "@/components/ui";
import {
    MissionMapEditor,
    MissionFormSidebar,
    useMissionWaypoints,
    waypointsValidationSchema,
    sanitizeWaypointForApi,
    determineActiveTabFromErrors,
    syncMissionWaypoints,
} from "@/components/missions";
import { missionService } from "@/services/missionService";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import type { Waypoint, Hub, Drone, MissionScheduleType, UpdateMissionPayload } from "@/types";
import { parseApiError, validateSchema, createFieldErrorCleaner } from "@/utils";
import { updateMissionBody } from "@/generated/mission";

export default function EditMissionPage() {
    const router = useRouter();
    const params = useParams();
    const missionId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [hubs, setHubs] = useState<Hub[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);

    const [missionStatus, setMissionStatus] = useState<string | null>(null);
    const [initialWaypoints, setInitialWaypoints] = useState<Waypoint[]>([]);

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

    const isReadOnly = Boolean(missionStatus && missionStatus.toLowerCase() !== "draft");

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
        let isMounted = true;

        async function initPage() {
            if (!missionId) {
                setError("Mission ID not provided");
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const [hubsRes, dronesRes, mission] = await Promise.all([
                    hubService.getHubs({ limit: 0 }),
                    droneService.getDrones({ limit: 0 }),
                    missionService.getById(missionId),
                ]);

                if (!isMounted) return;

                setHubs(hubsRes.items || []);
                setDrones(dronesRes.items || []);

                setMissionStatus(mission.status || "draft");
                setName(mission.name || "");
                setDescription(mission.description || "");
                setDepartureHubId(mission.departureHubId || "");
                setArrivalHubId(mission.arrivalHubId || "");
                if (mission.scheduleType === "immediate" || mission.scheduleType === "scheduled") {
                    setScheduleType(mission.scheduleType);
                }
                setScheduledAt(mission.scheduledAt ? mission.scheduledAt.slice(0, 16) : "");

                const loadedWaypoints: Waypoint[] = (mission.waypoints || []).map((wp, idx) => ({
                    ...wp,
                    sequence: wp.sequence || idx + 1,
                    tempId: wp.id || `wp-init-${idx}`,
                    name: wp.name || "",
                    latitude:
                        wp.latitude !== undefined && wp.latitude !== null ? Number(wp.latitude) : 0,
                    longitude:
                        wp.longitude !== undefined && wp.longitude !== null
                            ? Number(wp.longitude)
                            : 0,
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
                setInitialWaypoints(loadedWaypoints);
            } catch {
                if (isMounted) {
                    setError("Failed to load mission details or prerequisites");
                    toast.error("Failed to load mission details");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        initPage();

        return () => {
            isMounted = false;
        };
    }, [missionId, defaultAltitude, setWaypoints]);

    const handleSave = async () => {
        if (isReadOnly) {
            toast.error("Cannot edit a mission that is not in draft status");
            return;
        }

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

        const validation = validateSchema(updateMissionBody, payload);
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
            await missionService.updateMission(missionId, validation.data as UpdateMissionPayload);

            await syncMissionWaypoints(missionId, initialWaypoints, waypoints, defaultAltitude);

            toast.success("Mission updated successfully");
            router.push("/dashboard/missions");
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save mission");
            if (Object.keys(parsed.fieldErrors).length > 0) {
                setFieldErrors(parsed.fieldErrors);
                const { tab } = determineActiveTabFromErrors(parsed.fieldErrors, waypoints);
                setActiveSidebarTab(tab);
            } else {
                toast.error(parsed.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-[var(--color-tech-cyan)] animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 flex flex-col gap-6 w-full min-h-[calc(100vh-80px)]">
            <PageHeader title={isReadOnly ? "VIEW MISSION" : "EDIT MISSION"}>
                <div className="flex items-center gap-3">
                    <StatusBadge status={missionStatus || "draft"} showDot />
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
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                <Save className="w-4 h-4 text-white" />
                            )}
                            <span>Update Mission</span>
                        </ChamferButton>
                    )}
                </div>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 w-full flex-1 min-h-[680px]">
                <div className="xl:col-span-8 flex flex-col h-full min-h-[580px]">
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
                </div>

                <div className="xl:col-span-4 flex flex-col h-full min-h-[580px]">
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
                </div>
            </div>
        </div>
    );
}
