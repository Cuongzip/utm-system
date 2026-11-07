"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { SplitMapLayout, ChamferButton, OutlineButton, StatusBadge } from "@/components/ui";
import {
    FlightMapEditor,
    FlightFormSidebar,
    useFlightRoute,
    determineActiveTabFromFlightErrors,
    estimateRouteFeasibility,
} from "@/components/flights";
import { createFieldErrorCleaner, validateSchema } from "@/utils";
import { createFlightBody, updateFlightBody } from "@/generated/flight";
import type {
    Hub,
    Drone,
    Flight,
    FlightStatus,
    CreateFlightPayload,
    UpdateFlightPayload,
} from "@/types";

export interface FlightEditorProps {
    mode: "create" | "edit";
    initialData?: Flight | null;
    hubs?: Hub[];
    drones?: Drone[];
    onSave: (payload: CreateFlightPayload | UpdateFlightPayload) => Promise<void>;
    loading?: boolean;
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

    const [flightNumber, setFlightNumber] = useState(initialData?.flightNumber || "");
    const [droneId, setDroneId] = useState(initialData?.droneId || "");
    const [departureHubId, setDepartureHubId] = useState(initialData?.departureHubId || "");
    const [arrivalHubId, setArrivalHubId] = useState(initialData?.arrivalHubId || "");
    const [pilotId, setPilotId] = useState(initialData?.pilotId || "");
    const [cruisingAltitudeM, setCruisingAltitudeM] = useState<number>(
        initialData?.cruisingAltitudeM !== undefined ? initialData.cruisingAltitudeM : 120
    );
    const [notes, setNotes] = useState(initialData?.notes || "");
    const [executionId, setExecutionId] = useState(initialData?.executionId || "");
    const [scheduledDeparture, setScheduledDeparture] = useState(
        initialData?.scheduledDeparture || ""
    );
    const [scheduledArrival, setScheduledArrival] = useState(initialData?.scheduledArrival || "");
    const [feasibilityOverride, setFeasibilityOverride] = useState(
        initialData?.feasibilityOverride || ""
    );

    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "waypoints" | "schedule">(
        "details"
    );
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const clearFieldError = createFieldErrorCleaner(setFieldErrors);

    useEffect(() => {
        if (mode === "create") {
            const now = new Date();
            const depTime = new Date(now.getTime() + 30 * 60 * 1000);
            const arrTime = new Date(now.getTime() + 90 * 60 * 1000);

            if (!flightNumber) {
                setFlightNumber(`FL-${Math.floor(1000 + Math.random() * 9000)}`);
            }
            if (!droneId && drones.length > 0) {
                setDroneId(drones[0].id);
            }
            if (!departureHubId && hubs.length > 0) {
                setDepartureHubId(hubs[0].id);
            }
            if (!arrivalHubId && hubs.length > 1) {
                setArrivalHubId(hubs[1].id);
            }
            if (!scheduledDeparture) {
                setScheduledDeparture(depTime.toISOString());
            }
            if (!scheduledArrival) {
                setScheduledArrival(arrTime.toISOString());
            }
        }
    }, [
        mode,
        drones,
        hubs,
        flightNumber,
        droneId,
        departureHubId,
        arrivalHubId,
        scheduledDeparture,
        scheduledArrival,
    ]);

    useEffect(() => {
        if (initialData) {
            setFlightNumber(initialData.flightNumber || "");
            setDroneId(initialData.droneId || "");
            setDepartureHubId(initialData.departureHubId || "");
            setArrivalHubId(initialData.arrivalHubId || "");
            setPilotId(initialData.pilotId || "");
            setCruisingAltitudeM(
                initialData.cruisingAltitudeM !== undefined ? initialData.cruisingAltitudeM : 120
            );
            setNotes(initialData.notes || "");
            setExecutionId(initialData.executionId || "");
            setScheduledDeparture(initialData.scheduledDeparture || "");
            setScheduledArrival(initialData.scheduledArrival || "");
            setFeasibilityOverride(initialData.feasibilityOverride || "");
        }
    }, [initialData]);

    const isReadOnly = Boolean(
        mode === "edit" &&
        initialData &&
        !["planned", "scheduled", "authorized"].includes(initialData.status || "")
    );

    const selectedDepHub = useMemo(
        () => hubs.find((h) => h.id === departureHubId) || null,
        [hubs, departureHubId]
    );

    const selectedArrHub = useMemo(
        () => hubs.find((h) => h.id === arrivalHubId) || null,
        [hubs, arrivalHubId]
    );

    const selectedDrone = useMemo(
        () => drones.find((d) => d.id === droneId) || null,
        [drones, droneId]
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
        removeWaypoint,
        moveWaypointOrder,
        undoWaypoint,
        clearWaypoints,
        computedGeoJsonLineString,
        totalDistanceM,
    } = useFlightRoute({
        initialRoute: initialData?.plannedRoute as any,
        departureHub: selectedDepHub,
        arrivalHub: selectedArrHub,
        cruisingAltitude: cruisingAltitudeM,
        isReadOnly,
        onClearErrors: onClearRouteErrors,
    });

    const routeFeasibility = useMemo(() => {
        return estimateRouteFeasibility(totalDistanceM, selectedDrone);
    }, [totalDistanceM, selectedDrone]);

    const isFeasibilityWarning = Boolean(
        totalDistanceM > 0 &&
        (routeFeasibility.verdict === "marginal" || routeFeasibility.verdict === "no_go")
    );

    const handleSave = async () => {
        setFieldErrors({});

        if (departureHubId && arrivalHubId && departureHubId === arrivalHubId && hubs.length > 1) {
            setFieldErrors({
                arrivalHubId: "Departure and arrival vertiports must be different",
            });
            setActiveSidebarTab("details");
            return;
        }

        if (isFeasibilityWarning && !feasibilityOverride.trim()) {
            setFieldErrors({
                feasibilityOverride: "Reason is required",
            });
            setActiveSidebarTab("details");
            return;
        }

        const alt = Number(cruisingAltitudeM) || 120;

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

        const formatIsoSafe = (val: string) => {
            if (!val) return "";
            try {
                const d = new Date(val);
                return isNaN(d.getTime()) ? "" : d.toISOString();
            } catch {
                return "";
            }
        };

        if (mode === "create") {
            const payload: Record<string, unknown> = {
                flightNumber: flightNumber.trim(),
                droneId: droneId.trim(),
                departureHubId: departureHubId.trim(),
                arrivalHubId: arrivalHubId.trim(),
                pilotId: pilotId.trim() || undefined,
                cruisingAltitudeM: alt,
                notes: notes.trim() || undefined,
                executionId: executionId.trim() || undefined,
                scheduledDeparture: formatIsoSafe(scheduledDeparture),
                scheduledArrival: formatIsoSafe(scheduledArrival),
                plannedRoute: plannedRoute ?? undefined,
                feasibilityOverride: feasibilityOverride.trim() || undefined,
                feasibilityVerdict: routeFeasibility.verdict,
            };

            const validation = validateSchema(createFlightBody, payload);
            if (!validation.success) {
                setFieldErrors(validation.errors);
                setActiveSidebarTab(determineActiveTabFromFlightErrors(validation.errors));
                return;
            }

            setSubmitting(true);
            try {
                await onSave(validation.data as CreateFlightPayload);
            } finally {
                setSubmitting(false);
            }
        } else {
            const payload: Record<string, unknown> = {
                droneId: droneId.trim() || undefined,
                departureHubId: departureHubId.trim() || undefined,
                arrivalHubId: arrivalHubId.trim() || undefined,
                pilotId: pilotId.trim() || undefined,
                cruisingAltitudeM: alt,
                notes: notes.trim() || undefined,
                scheduledDeparture: formatIsoSafe(scheduledDeparture) || undefined,
                scheduledArrival: formatIsoSafe(scheduledArrival) || undefined,
                plannedRoute: plannedRoute ?? undefined,
                feasibilityOverride: feasibilityOverride.trim() || undefined,
                feasibilityVerdict: routeFeasibility.verdict,
            };

            const validation = validateSchema(updateFlightBody, payload);
            if (!validation.success) {
                setFieldErrors(validation.errors);
                setActiveSidebarTab(determineActiveTabFromFlightErrors(validation.errors));
                return;
            }

            setSubmitting(true);
            try {
                await onSave(validation.data as UpdateFlightPayload);
            } finally {
                setSubmitting(false);
            }
        }
    };

    const flightStatus: FlightStatus = initialData?.status || "planned";

    const pageTitle =
        mode === "create"
            ? "REGISTER NEW FLIGHT"
            : isReadOnly
              ? `VIEW FLIGHT PLAN: ${flightNumber}`
              : `EDIT FLIGHT PLAN: ${flightNumber}`;

    return (
        <SplitMapLayout
            title={pageTitle}
            badges={mode === "edit" ? <StatusBadge status={flightStatus} showDot /> : null}
            headerActions={
                <div className="flex items-center gap-2">
                    <OutlineButton
                        size="sm"
                        onClick={() => router.push("/dashboard/flights")}
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
                    cruisingAltitude={cruisingAltitudeM}
                    onCruisingAltitudeChange={setCruisingAltitudeM}
                    selectedWaypointId={selectedWaypointId}
                    onAddWaypoint={addWaypoint}
                    onMoveWaypoint={moveWaypoint}
                    onSelectWaypoint={(wp) => setSelectedWaypointId(wp ? wp.id : null)}
                    onUndoWaypoint={undoWaypoint}
                    onClearWaypoints={clearWaypoints}
                    isReadOnly={isReadOnly}
                    className="h-full"
                />
            }
            sidebarContent={
                <FlightFormSidebar
                    flightId={initialData?.id}
                    mode={mode}
                    flightNumber={flightNumber}
                    onFlightNumberChange={setFlightNumber}
                    droneId={droneId}
                    onDroneIdChange={setDroneId}
                    departureHubId={departureHubId}
                    onDepartureHubIdChange={setDepartureHubId}
                    arrivalHubId={arrivalHubId}
                    onArrivalHubIdChange={setArrivalHubId}
                    pilotId={pilotId}
                    onPilotIdChange={setPilotId}
                    cruisingAltitudeM={cruisingAltitudeM}
                    onCruisingAltitudeMChange={setCruisingAltitudeM}
                    notes={notes}
                    onNotesChange={setNotes}
                    executionId={executionId}
                    onExecutionIdChange={setExecutionId}
                    scheduledDeparture={scheduledDeparture}
                    onScheduledDepartureChange={setScheduledDeparture}
                    scheduledArrival={scheduledArrival}
                    onScheduledArrivalChange={setScheduledArrival}
                    drones={drones}
                    hubs={hubs}
                    waypoints={waypoints}
                    selectedWaypoint={selectedWaypoint}
                    onSelectWaypoint={(wp) => setSelectedWaypointId(wp ? wp.id : null)}
                    onUpdateWaypoint={updateWaypoint}
                    onRemoveWaypoint={removeWaypoint}
                    onMoveWaypointOrder={moveWaypointOrder}
                    totalDistanceM={totalDistanceM}
                    feasibilityVerdict={routeFeasibility.verdict}
                    feasibilityOverride={feasibilityOverride}
                    onFeasibilityOverrideChange={setFeasibilityOverride}
                    isFeasibilityWarning={isFeasibilityWarning}
                    activeTab={activeSidebarTab}
                    onTabChange={setActiveSidebarTab}
                    fieldErrors={fieldErrors}
                    onClearFieldError={clearFieldError}
                    isReadOnly={isReadOnly}
                />
            }
        />
    );
}

export default FlightEditor;
