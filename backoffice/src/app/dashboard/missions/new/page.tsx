"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    ChamferButton,
    OutlineButton,
    AlertBanner,
    PageHeader,
    StatusBadge,
} from "@/components/ui";
import { MissionMapEditor, MissionFormSidebar } from "@/components/missions";
import { missionService } from "@/services/missionService";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import type {
    Waypoint,
    Hub,
    Drone,
    MissionScheduleType,
    CreateMissionPayload,
    UpdateMissionPayload,
} from "@/types";
import { calculateDistance, parseApiError, validateSchema } from "@/utils";
import { createMissionBody, updateMissionBody } from "@/generated/mission";

export default function NewMissionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editMissionId = searchParams.get("edit");

    const [loading, setLoading] = useState(false);
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

    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
    const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);
    const [defaultAltitude, setDefaultAltitude] = useState(50);
    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "waypoints" | "schedule">(
        "details"
    );

    const fetchPrerequisites = useCallback(async () => {
        try {
            const [hubsRes, dronesRes] = await Promise.all([
                hubService.getHubs({ limit: 0 }),
                droneService.getDrones({ limit: 0 }),
            ]);
            setHubs(hubsRes.items || []);
            setDrones(dronesRes.items || []);

            if (hubsRes.items && hubsRes.items.length > 0 && !editMissionId) {
                setDepartureHubId(hubsRes.items[0].id);
                if (hubsRes.items.length > 1) {
                    setArrivalHubId(hubsRes.items[1].id);
                }
            }
        } catch {
            setError("Failed to load hubs and drone fleets");
        }
    }, [editMissionId]);

    useEffect(() => {
        let isMounted = true;
        (async () => {
            if (isMounted) await fetchPrerequisites();
        })();
        return () => {
            isMounted = false;
        };
    }, [fetchPrerequisites]);

    useEffect(() => {
        if (!editMissionId) return;

        async function loadMission() {
            setLoading(true);
            try {
                const mission = await missionService.getById(editMissionId!);
                setMissionStatus(mission.status || "draft");
                setName(mission.name || "");
                setDescription(mission.description || "");
                setDepartureHubId(mission.departureHubId || "");
                setArrivalHubId(mission.arrivalHubId || "");
                if (mission.scheduleType === "immediate" || mission.scheduleType === "scheduled") {
                    setScheduleType(mission.scheduleType);
                }
                setScheduledAt(mission.scheduledAt ? mission.scheduledAt.slice(0, 16) : "");
                const loadedWaypoints = (mission.waypoints || []).map((wp, idx) => ({
                    ...wp,
                    sequence: wp.sequence || idx + 1,
                    tempId: wp.id || `wp-init-${idx}`,
                }));
                setWaypoints(loadedWaypoints);
                setInitialWaypoints(loadedWaypoints);
            } catch {
                toast.error("Failed to load mission details for editing");
            } finally {
                setLoading(false);
            }
        }

        loadMission();
    }, [editMissionId]);

    const isReadOnly = Boolean(
        editMissionId && missionStatus && missionStatus.toLowerCase() !== "draft"
    );

    const selectedDepartureHub = useMemo(
        () => hubs.find((h) => h.id === departureHubId) || null,
        [hubs, departureHubId]
    );

    const selectedArrivalHub = useMemo(
        () => hubs.find((h) => h.id === (arrivalHubId || departureHubId)) || null,
        [hubs, arrivalHubId, departureHubId]
    );

    const totalDistanceM = useMemo(() => {
        const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const pts: { lat: number; lng: number }[] = [];

        if (
            selectedDepartureHub?.location?.lat !== undefined &&
            selectedDepartureHub?.location?.lng !== undefined
        ) {
            pts.push({
                lat: selectedDepartureHub.location.lat,
                lng: selectedDepartureHub.location.lng,
            });
        }

        sorted.forEach((wp) => {
            const lat = wp.latitude ?? 0;
            const lng = wp.longitude ?? 0;
            const last = pts[pts.length - 1];
            if (!last || calculateDistance(last.lat, last.lng, lat, lng) > 15) {
                pts.push({ lat, lng });
            }
        });

        if (
            selectedArrivalHub?.location?.lat !== undefined &&
            selectedArrivalHub?.location?.lng !== undefined
        ) {
            const arrLat = selectedArrivalHub.location.lat;
            const arrLng = selectedArrivalHub.location.lng;
            const last = pts[pts.length - 1];
            if (!last || calculateDistance(last.lat, last.lng, arrLat, arrLng) > 15) {
                pts.push({ lat: arrLat, lng: arrLng });
            }
        }

        if (pts.length >= 2) {
            let sum = 0;
            for (let i = 1; i < pts.length; i++) {
                sum += calculateDistance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
            }
            return sum;
        }
        return 0;
    }, [waypoints, selectedDepartureHub, selectedArrivalHub]);

    const handleAddWaypoint = (lat: number, lng: number, altitude: number) => {
        const nextSeq = waypoints.length + 1;
        const newWp: Waypoint = {
            tempId: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            sequence: nextSeq,
            name: `Waypoint ${nextSeq}`,
            latitude: lat,
            longitude: lng,
            altitude: altitude || defaultAltitude,
        };
        setWaypoints((prev) => [...prev, newWp]);
    };

    const handleUpdateWaypoint = (updated: Waypoint) => {
        setWaypoints((prev) =>
            prev.map((w) => {
                const match =
                    (w.id && w.id === updated.id) || (w.tempId && w.tempId === updated.tempId);
                return match ? updated : w;
            })
        );
    };

    const handleDeleteWaypoint = (idOrTempId: string) => {
        setWaypoints((prev) => {
            const filtered = prev.filter((w) => w.id !== idOrTempId && w.tempId !== idOrTempId);
            return filtered.map((w, idx) => ({ ...w, sequence: idx + 1 }));
        });
        if (selectedWaypointId === idOrTempId) {
            setSelectedWaypointId(null);
        }
    };

    const handleGenerateHubToHub = () => {
        if (!selectedDepartureHub?.location || !selectedArrivalHub?.location) {
            toast.error("Please select both Departure Hub and Arrival Hub first");
            return;
        }

        const depLat = selectedDepartureHub.location.lat;
        const depLng = selectedDepartureHub.location.lng;
        const arrLat = selectedArrivalHub.location.lat;
        const arrLng = selectedArrivalHub.location.lng;

        if (
            depLat === undefined ||
            depLng === undefined ||
            arrLat === undefined ||
            arrLng === undefined
        ) {
            toast.error("Selected hubs do not have valid GPS coordinates");
            return;
        }

        const midLat1 = depLat + (arrLat - depLat) * 0.33;
        const midLng1 = depLng + (arrLng - depLng) * 0.33;
        const midLat2 = depLat + (arrLat - depLat) * 0.66;
        const midLng2 = depLng + (arrLng - depLng) * 0.66;

        const newWaypoints: Waypoint[] = [
            {
                tempId: `hub-wp-1-${Date.now()}`,
                sequence: 1,
                name: `Dep: ${selectedDepartureHub.name}`,
                latitude: Number(depLat.toFixed(6)),
                longitude: Number(depLng.toFixed(6)),
                altitude: defaultAltitude,
            },
            {
                tempId: `hub-wp-2-${Date.now()}`,
                sequence: 2,
                name: "Climb & Enroute",
                latitude: Number(midLat1.toFixed(6)),
                longitude: Number(midLng1.toFixed(6)),
                altitude: defaultAltitude + 20,
            },
            {
                tempId: `hub-wp-3-${Date.now()}`,
                sequence: 3,
                name: "Approach Fix",
                latitude: Number(midLat2.toFixed(6)),
                longitude: Number(midLng2.toFixed(6)),
                altitude: defaultAltitude + 10,
            },
            {
                tempId: `hub-wp-4-${Date.now()}`,
                sequence: 4,
                name: `Arr: ${selectedArrivalHub.name}`,
                latitude: Number(arrLat.toFixed(6)),
                longitude: Number(arrLng.toFixed(6)),
                altitude: defaultAltitude,
            },
        ];

        setWaypoints(newWaypoints);
        toast.success(
            `Generated direct route from ${selectedDepartureHub.code || selectedDepartureHub.name} to ${selectedArrivalHub.code || selectedArrivalHub.name}`
        );
    };

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

        const schema = editMissionId ? updateMissionBody : createMissionBody;
        const validation = validateSchema(schema, payload);

        if (!validation.success) {
            if (
                validation.errors.name ||
                validation.errors.departureHubId ||
                validation.errors.arrivalHubId ||
                validation.errors.scheduledAt
            ) {
                setActiveSidebarTab("details");
            }
            const firstError = Object.values(validation.errors)[0];
            toast.error(firstError || "Please check your mission inputs");
            return;
        }

        setSubmitting(true);
        try {
            let savedMissionId = editMissionId;
            if (editMissionId) {
                await missionService.updateMission(
                    editMissionId,
                    validation.data as UpdateMissionPayload
                );

                const currentWpIds = new Set(waypoints.map((w) => w.id).filter(Boolean));
                const toDelete = initialWaypoints.filter((w) => w.id && !currentWpIds.has(w.id));
                for (const delWp of toDelete) {
                    await missionService.deleteWaypoint(editMissionId, delWp.id!);
                }

                const initialMap = new Map(initialWaypoints.map((w) => [w.id, w]));
                for (const wp of waypoints) {
                    if (wp.id && initialMap.has(wp.id)) {
                        const init = initialMap.get(wp.id)!;
                        const hasChanged =
                            init.latitude !== wp.latitude ||
                            init.longitude !== wp.longitude ||
                            init.altitude !== wp.altitude ||
                            init.name !== wp.name ||
                            JSON.stringify(init.actions || null) !==
                                JSON.stringify(wp.actions || null) ||
                            JSON.stringify(init.conditions || null) !==
                                JSON.stringify(wp.conditions || null);

                        if (hasChanged && wp.latitude !== undefined && wp.longitude !== undefined) {
                            await missionService.updateWaypoint(editMissionId, wp.id, {
                                name: wp.name,
                                latitude: wp.latitude,
                                longitude: wp.longitude,
                                altitude: wp.altitude || defaultAltitude,
                                actions: wp.actions,
                                conditions: wp.conditions,
                            });
                        }
                    }
                }

                for (const wp of waypoints) {
                    if (!wp.id && wp.latitude !== undefined && wp.longitude !== undefined) {
                        await missionService.addWaypoint(editMissionId, {
                            name: wp.name,
                            latitude: wp.latitude,
                            longitude: wp.longitude,
                            altitude: wp.altitude || defaultAltitude,
                            actions: wp.actions,
                            conditions: wp.conditions,
                        });
                    }
                }

                const orderChanged = waypoints.some(
                    (wp, idx) => wp.id && initialMap.get(wp.id)?.sequence !== idx + 1
                );
                if (
                    orderChanged &&
                    toDelete.length === 0 &&
                    waypoints.every((w) => Boolean(w.id))
                ) {
                    await missionService.reorderWaypoints(editMissionId, {
                        order: waypoints.map((wp, idx) => ({
                            waypointId: wp.id!,
                            sequence: idx + 1,
                        })),
                    });
                }

                toast.success("Mission updated successfully");
            } else {
                const created = await missionService.createMission(
                    validation.data as CreateMissionPayload
                );
                savedMissionId = created.id;

                if (savedMissionId && waypoints.length > 0) {
                    for (const wp of waypoints) {
                        if (wp.latitude !== undefined && wp.longitude !== undefined) {
                            await missionService.addWaypoint(savedMissionId, {
                                name: wp.name,
                                latitude: wp.latitude,
                                longitude: wp.longitude,
                                altitude: wp.altitude || defaultAltitude,
                                actions: wp.actions,
                                conditions: wp.conditions,
                            });
                        }
                    }
                }
                toast.success("Mission created successfully");
            }

            if (savedMissionId && droneId) {
                try {
                    await missionService.executeMission(savedMissionId, {
                        droneId,
                        pilotId: "operator",
                    });
                } catch {}
            }

            router.push("/dashboard/missions");
        } catch (err: unknown) {
            const parsed = parseApiError(err, "Failed to save mission");
            toast.error(parsed.message);
        } finally {
            setSubmitting(false);
        }
    };

    const selectedWaypoint = useMemo(() => {
        if (!selectedWaypointId) return null;
        return (
            waypoints.find((w) => w.id === selectedWaypointId || w.tempId === selectedWaypointId) ||
            null
        );
    }, [waypoints, selectedWaypointId]);

    const handleSelectWaypoint = (wp: Waypoint | null) => {
        setSelectedWaypointId(wp ? String(wp.id || wp.tempId) : null);
        if (wp) {
            setActiveSidebarTab("waypoints");
        }
    };

    const handleMoveWaypoint = useCallback((wpId: string, lat: number, lng: number) => {
        setWaypoints((prev) =>
            prev.map((wp) => {
                if (String(wp.id || wp.tempId) === wpId) {
                    return { ...wp, latitude: lat, longitude: lng };
                }
                return wp;
            })
        );
    }, []);

    const handleMoveWaypointOrder = useCallback((fromIndex: number, toIndex: number) => {
        setWaypoints((prev) => {
            if (
                fromIndex < 0 ||
                fromIndex >= prev.length ||
                toIndex < 0 ||
                toIndex >= prev.length
            ) {
                return prev;
            }
            const reordered = [...prev];
            const [moved] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, moved);
            return reordered.map((wp, idx) => ({
                ...wp,
                sequence: idx + 1,
            }));
        });
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 text-[var(--color-tech-cyan)] animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-8 flex flex-col gap-6 w-full min-h-[calc(100vh-80px)]">
            <PageHeader
                title={isReadOnly ? "VIEW MISSION" : editMissionId ? "EDIT MISSION" : "NEW MISSION"}
            >
                <div className="flex items-center gap-3">
                    {isReadOnly && <StatusBadge status={missionStatus || "executing"} showDot />}
                    <OutlineButton
                        size="sm"
                        onClick={() => router.push("/dashboard/missions")}
                        disabled={submitting}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />
                        <span>Back to Missions</span>
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
                            <span>{editMissionId ? "Update Mission" : "Save Mission"}</span>
                        </ChamferButton>
                    )}
                </div>
            </PageHeader>

            {isReadOnly && (
                <AlertBanner
                    message={`This mission is currently in "${missionStatus?.toUpperCase()}" status and is view-only. Only DRAFT missions can be edited.`}
                />
            )}

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
                        className="h-full"
                    />
                </div>
            </div>
        </div>
    );
}
