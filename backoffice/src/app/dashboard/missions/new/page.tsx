"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, OutlineButton, AlertBanner, PageHeader } from "@/components/ui";
import {
    MissionMapEditor,
    MissionFormSidebar,
    useMissionWaypoints,
    waypointsValidationSchema,
    sanitizeWaypointForApi,
    determineActiveTabFromErrors,
    createMissionWaypoints,
} from "@/components/missions";
import { missionService } from "@/services/missionService";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import type { Hub, Drone, MissionScheduleType, CreateMissionPayload } from "@/types";
import { parseApiError, validateSchema, createFieldErrorCleaner } from "@/utils";
import { createMissionBody } from "@/generated/mission";

export default function NewMissionPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [hubs, setHubs] = useState<Hub[]>([]);
    const [drones, setDrones] = useState<Drone[]>([]);

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
        departureHub: selectedDepartureHub,
        arrivalHub: selectedArrivalHub,
        onClearWaypointErrors,
    });

    const fetchPrerequisites = useCallback(async () => {
        try {
            setLoading(true);
            const [hubsRes, dronesRes] = await Promise.all([
                hubService.getHubs({ limit: 0 }),
                droneService.getDrones({ limit: 0 }),
            ]);
            const loadedHubs = hubsRes.items || [];
            setHubs(loadedHubs);
            setDrones(dronesRes.items || []);

            if (loadedHubs.length > 0) {
                setDepartureHubId((prev) => prev || loadedHubs[0].id);
                if (loadedHubs.length > 1) {
                    setArrivalHubId((prev) => prev || loadedHubs[1].id);
                }
            }
        } catch {
            setError("Failed to load hubs and drone fleets");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            if (isMounted) await fetchPrerequisites();
        })();
        return () => {
            isMounted = false;
        };
    }, [fetchPrerequisites]);

    const handleSave = async () => {
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

        const validation = validateSchema(createMissionBody, payload);
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
            const created = await missionService.createMission(
                validation.data as CreateMissionPayload
            );
            const savedMissionId = created.id;

            if (savedMissionId && waypoints.length > 0) {
                await createMissionWaypoints(savedMissionId, waypoints, defaultAltitude);
            }

            if (savedMissionId && droneId) {
                try {
                    await missionService.executeMission(savedMissionId, {
                        droneId,
                        pilotId: "operator",
                    });
                } catch {}
            }

            toast.success("Mission created successfully");
            router.push("/dashboard/missions");
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to create mission");
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
            <PageHeader title="NEW MISSION">
                <div className="flex items-center gap-3">
                    <OutlineButton
                        size="sm"
                        onClick={() => router.push("/dashboard/missions")}
                        disabled={submitting}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                        <span>Cancel</span>
                    </OutlineButton>

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
                        <span>Save Mission</span>
                    </ChamferButton>
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
                        fieldErrors={fieldErrors}
                        onClearFieldError={clearFieldError}
                    />
                </div>
            </div>
        </div>
    );
}
