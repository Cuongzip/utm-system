"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { SplitMapLayout, ChamferButton, StatusBadge } from "@/components/ui";
import {
    FlightMapEditor,
    FlightFormSidebar,
    useFlightRoute,
    type FlightWaypoint,
    determineActiveTabFromFlightErrors,
    estimateRouteFeasibility,
} from "@/components/flights";
import { clearFieldError, validateSchema } from "@/utils";
import { createFlightBody, updateFlightBody } from "@/generated/flight";
import {
    getInitialFlightFormPayload,
    EDITABLE_FLIGHT_STATUSES,
    DEFAULT_FLIGHT_STATUS,
    FEASIBILITY_VERDICT,
    WAYPOINT_ACTION_TYPE,
    type Hub,
    type Drone,
    type Flight,
    type FlightStatus,
    type CreateFlightPayload,
    type UpdateFlightPayload,
    type FlightFormPayload,
} from "@/types";

export interface FlightEditorProps {
    mode: "create" | "edit";
    initialData?: Flight | null;
    hubs: Hub[];
    drones: Drone[];
    onSave: (payload: CreateFlightPayload | UpdateFlightPayload) => Promise<void>;
    loading: boolean;
}

export function FlightEditor({
    mode,
    initialData,
    hubs = [],
    drones = [],
    onSave,
    loading = false,
}: FlightEditorProps) {
    const router = useRouter();

    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState<FlightFormPayload>(() =>
        getInitialFlightFormPayload(initialData)
    );

    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "waypoints" | "schedule">(
        "details"
    );
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const handleClearFieldError = useCallback(
        (...fields: string[]) => clearFieldError(setFieldErrors, ...fields),
        []
    );

    const handleFormChange = useCallback(
        <K extends keyof FlightFormPayload>(field: K, value: FlightFormPayload[K]) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
            handleClearFieldError(field);
        },
        [handleClearFieldError]
    );

    useEffect(() => {
        if (initialData) {
            setFormData(getInitialFlightFormPayload(initialData));
        }
    }, [initialData]);

    useEffect(() => {
        if (mode === "create") {
            setFormData((prev) => {
                let updated = false;
                const next = { ...prev };
                if (!next.droneId && drones.length > 0) {
                    next.droneId = drones[0].id;
                    updated = true;
                }
                if (!next.departureHubId && hubs.length > 0) {
                    next.departureHubId = hubs[0].id;
                    updated = true;
                }
                if (!next.arrivalHubId && hubs.length > 1) {
                    next.arrivalHubId = hubs[1].id;
                    updated = true;
                }
                return updated ? next : prev;
            });
        }
    }, [mode, drones, hubs]);

    const isReadOnly = Boolean(
        mode === "edit" &&
        initialData &&
        !EDITABLE_FLIGHT_STATUSES.includes(initialData.status as FlightStatus)
    );

    const selectedDepHub = useMemo(
        () => hubs.find((h) => h.id === formData.departureHubId) || null,
        [hubs, formData.departureHubId]
    );

    const selectedArrHub = useMemo(
        () => hubs.find((h) => h.id === formData.arrivalHubId) || null,
        [hubs, formData.arrivalHubId]
    );

    const selectedDrone = useMemo(
        () => drones.find((d) => d.id === formData.droneId) || null,
        [drones, formData.droneId]
    );

    const onClearRouteErrors = useCallback(() => {
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.plannedRoute;
            delete next["plannedRoute.coordinates"];
            delete next.route;
            return next;
        });
    }, []);

    const {
        waypoints,
        selectedWaypointId,
        setSelectedWaypointId,
        selectedWaypoint,
        addWaypoint,
        updateWaypoint,
        moveWaypoint,
        deleteWaypoint,
        moveWaypointOrder,
        undoWaypoint,
        clearWaypoints,
        computedGeoJsonLineString,
        totalDistanceM,
    } = useFlightRoute({
        initialWaypoints: initialData?.waypoints,
        initialRoute: initialData?.plannedRoute as any,
        departureHub: selectedDepHub,
        arrivalHub: selectedArrHub,
        cruisingAltitude: formData.cruisingAltitudeM ?? 120,
        isReadOnly,
        onClearErrors: onClearRouteErrors,
    });

    const routeFeasibility = useMemo(() => {
        return estimateRouteFeasibility(totalDistanceM, selectedDrone);
    }, [totalDistanceM, selectedDrone]);

    const isFeasibilityWarning = Boolean(
        totalDistanceM > 0 &&
        (routeFeasibility.verdict === FEASIBILITY_VERDICT.MARGINAL ||
            routeFeasibility.verdict === FEASIBILITY_VERDICT.NO_GO)
    );

    const handleSave = async () => {
        setFieldErrors({});

        if (isFeasibilityWarning && !formData.feasibilityOverride?.trim()) {
            setFieldErrors({
                feasibilityOverride: "Reason is required",
            });
            setActiveSidebarTab("details");
            return;
        }

        const alt = formData.cruisingAltitudeM ?? 120;

        let plannedRoute = computedGeoJsonLineString;
        if (!plannedRoute && selectedDepHub?.location && selectedArrHub?.location) {
            plannedRoute = {
                type: "LineString",
                coordinates: [
                    [
                        selectedDepHub.location.longitude,
                        selectedDepHub.location.latitude,
                        selectedDepHub.altitudeMsl ?? 0,
                    ],
                    [
                        selectedArrHub.location.longitude,
                        selectedArrHub.location.latitude,
                        selectedArrHub.altitudeMsl ?? 0,
                    ],
                ],
            };
        }

        const formatIsoSafe = (val?: string) => {
            if (!val) return "";
            try {
                const d = new Date(val);
                return isNaN(d.getTime()) ? "" : d.toISOString();
            } catch {
                return "";
            }
        };

        const basePayload: Record<string, unknown> = {
            droneId: formData.droneId?.trim() || undefined,
            departureHubId: formData.departureHubId?.trim() || undefined,
            arrivalHubId: formData.arrivalHubId?.trim() || undefined,
            pilotId: formData.pilotId?.trim() || undefined,
            cruisingAltitudeM: alt,
            notes: formData.notes?.trim() || undefined,
            scheduledDeparture: formatIsoSafe(formData.scheduledDeparture) || undefined,
            scheduledArrival: formatIsoSafe(formData.scheduledArrival) || undefined,
            plannedRoute: plannedRoute ?? undefined,
            feasibilityOverride: formData.feasibilityOverride?.trim() || undefined,
            feasibilityVerdict: routeFeasibility.verdict,
        };

        const isCreate = mode === "create";
        const payload: Record<string, unknown> = isCreate
            ? {
                  ...basePayload,
                  flightNumber: formData.flightNumber?.toUpperCase(),
                  executionId: formData.executionId?.trim() || undefined,
              }
            : basePayload;

        const schema = isCreate ? createFlightBody : updateFlightBody;
        const validation = validateSchema(schema, payload);
        if (!validation.success) {
            setFieldErrors(validation.errors);
            setActiveSidebarTab(determineActiveTabFromFlightErrors(validation.errors));
            return;
        }

        const validated = validation.data as Record<string, unknown>;
        const flightWaypoints: FlightWaypoint[] = [
            ...(selectedDepHub?.location
                ? [
                      {
                          sequence: 1,
                          name: `Departure: ${selectedDepHub.name || selectedDepHub.code || "Hub"}`,
                          latitude: selectedDepHub.location.latitude,
                          longitude: selectedDepHub.location.longitude,
                          altitude: selectedDepHub.altitudeMsl ?? 0,
                          actions: { type: WAYPOINT_ACTION_TYPE.TAKEOFF },
                      },
                  ]
                : []),
            ...waypoints.map((wp, idx) => ({
                sequence: (selectedDepHub?.location ? 2 : 1) + idx,
                name: wp.name?.trim() || `Waypoint ${(selectedDepHub?.location ? 2 : 1) + idx}`,
                latitude: wp.latitude,
                longitude: wp.longitude,
                altitude: wp.altitude ?? alt,
                actions: wp.actions || { type: WAYPOINT_ACTION_TYPE.FLY_THROUGH },
                conditions: wp.conditions || undefined,
            })),
            ...(selectedArrHub?.location
                ? [
                      {
                          sequence: (selectedDepHub?.location ? 2 : 1) + waypoints.length,
                          name: `Arrival: ${selectedArrHub.name || selectedArrHub.code || "Hub"}`,
                          latitude: selectedArrHub.location.latitude,
                          longitude: selectedArrHub.location.longitude,
                          altitude: selectedArrHub.altitudeMsl ?? 0,
                          actions: { type: WAYPOINT_ACTION_TYPE.LAND },
                      },
                  ]
                : []),
        ];

        setSubmitting(true);
        try {
            await onSave({
                ...validated,
                waypoints: flightWaypoints,
            } as CreateFlightPayload | UpdateFlightPayload);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectWaypoint = useCallback(
        (wp: FlightWaypoint | null) => {
            setSelectedWaypointId(wp ? String(wp.id || wp.tempId) : null);
            if (wp) {
                setActiveSidebarTab("waypoints");
            }
        },
        [setSelectedWaypointId]
    );

    const flightStatus: FlightStatus = initialData?.status ?? DEFAULT_FLIGHT_STATUS;
    const pageTitle =
        mode === "create"
            ? "REGISTER NEW FLIGHT"
            : isReadOnly
              ? `VIEW FLIGHT PLAN: ${formData.flightNumber || initialData?.flightNumber || ""}`
              : `EDIT FLIGHT PLAN: ${formData.flightNumber || initialData?.flightNumber || ""}`;

    return (
        <SplitMapLayout
            title={pageTitle}
            badges={mode === "edit" ? <StatusBadge status={flightStatus} showDot /> : null}
            headerActions={
                <div className="flex items-center gap-2">
                    <ChamferButton
                        variant="outline"
                        size="sm"
                        clip="xs"
                        onClick={() => router.push("/dashboard/flights")}
                        disabled={submitting}
                    >
                        <ArrowLeft className="w-3.5 h-3.5 text-current" />
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
                            <span>{mode === "create" ? "Save Flight" : "Update Plan"}</span>
                        </ChamferButton>
                    )}
                </div>
            }
            mapContent={
                <FlightMapEditor
                    departureHub={selectedDepHub}
                    arrivalHub={selectedArrHub}
                    waypoints={waypoints}
                    cruisingAltitude={formData.cruisingAltitudeM ?? 120}
                    onCruisingAltitudeChange={(alt) => handleFormChange("cruisingAltitudeM", alt)}
                    selectedWaypointId={selectedWaypointId}
                    onAddWaypoint={addWaypoint}
                    onMoveWaypoint={moveWaypoint}
                    onSelectWaypoint={handleSelectWaypoint}
                    onUndoWaypoint={undoWaypoint}
                    onClearWaypoints={clearWaypoints}
                    isReadOnly={isReadOnly}
                    className="h-full"
                />
            }
            sidebarContent={
                <FlightFormSidebar
                    formData={formData}
                    onFormChange={handleFormChange}
                    mode={mode}
                    drones={drones}
                    hubs={hubs}
                    departureHub={selectedDepHub}
                    arrivalHub={selectedArrHub}
                    waypoints={waypoints}
                    selectedWaypoint={selectedWaypoint}
                    onSelectWaypoint={handleSelectWaypoint}
                    onUpdateWaypoint={updateWaypoint}
                    onDeleteWaypoint={deleteWaypoint}
                    onMoveWaypointOrder={moveWaypointOrder}
                    totalDistanceM={totalDistanceM}
                    feasibilityVerdict={routeFeasibility.verdict}
                    isFeasibilityWarning={isFeasibilityWarning}
                    activeTab={activeSidebarTab}
                    onTabChange={setActiveSidebarTab}
                    fieldErrors={fieldErrors}
                    onClearFieldError={handleClearFieldError}
                    isReadOnly={isReadOnly}
                />
            }
        />
    );
}
