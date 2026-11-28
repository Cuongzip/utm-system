"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    ArrowLeft,
    ArrowUpRight,
    Save,
    Loader2,
    FileSearch,
    ShieldCheck,
    Play,
    Radio,
    RotateCcw,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import { SplitMapLayout, ChamferButton, StatusBadge, ConfirmDialog } from "@/components/ui";
import {
    FlightMapEditor,
    FlightFormSidebar,
    PreFlightBriefingModal,
    useFlightRoute,
    type FlightWaypoint,
    type FlightLineStringGeometry,
    determineActiveTabFromFlightErrors,
    estimateRouteFeasibility,
} from "@/components/flights";
import { QUERY_KEYS, usePermissions } from "@/hooks";
import { flightService } from "@/services/flightService";
import { clearFieldError, validateSchema } from "@/utils";
import { createFlightBody, updateFlightBody } from "@/generated/flight";
import {
    getInitialFlightFormPayload,
    EDITABLE_FLIGHT_STATUSES,
    ACTIVE_FLIGHT_STATUSES,
    CONTROLLABLE_FLIGHT_STATUSES,
    DEFAULT_FLIGHT_STATUS,
    FLIGHT_STATUS,
    FLIGHT_AUTHORIZATION_STATUS,
    FEASIBILITY_VERDICT,
    WAYPOINT_ACTION_TYPE,
    HUB_STATUS,
    type Hub,
    type Drone,
    type Flight,
    type FlightStatus,
    type FlightAuthorizationStatus,
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
    onBackToReplay?: () => void;
}

export function FlightEditor({
    mode,
    initialData,
    hubs = [],
    drones = [],
    onSave,
    loading = false,
    onBackToReplay,
}: FlightEditorProps) {
    const router = useRouter();
    const t = useTranslations("flights");
    const td = useTranslations("flights.deck");
    const tCommon = useTranslations("common");
    const tWp = useTranslations("waypoints");
    const queryClient = useQueryClient();
    const { canAuthorizeFlight } = usePermissions();

    const [submitting, setSubmitting] = useState(false);
    const [briefingOpen, setBriefingOpen] = useState(false);
    const [confirmAbortOpen, setConfirmAbortOpen] = useState(false);
    const [prevInitialData, setPrevInitialData] = useState(initialData);
    const [rawFormData, setRawFormData] = useState<FlightFormPayload>(() =>
        getInitialFlightFormPayload(initialData)
    );

    if (initialData && initialData !== prevInitialData) {
        setPrevInitialData(initialData);
        setRawFormData(getInitialFlightFormPayload(initialData));
    }

    const activeHubs = useMemo(
        () => hubs.filter((h) => (h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE),
        [hubs]
    );

    const formData = useMemo<FlightFormPayload>(() => {
        if (mode !== "create") return rawFormData;
        const defaultHubPool = activeHubs.length > 0 ? activeHubs : hubs;
        return {
            ...rawFormData,
            droneId: rawFormData.droneId || (drones[0]?.id ?? ""),
            departureHubId: rawFormData.departureHubId || (defaultHubPool[0]?.id ?? ""),
            arrivalHubId:
                rawFormData.arrivalHubId || (defaultHubPool[1]?.id ?? defaultHubPool[0]?.id ?? ""),
        };
    }, [mode, rawFormData, drones, hubs, activeHubs]);

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
            setRawFormData((prev) => ({ ...prev, [field]: value }));
            handleClearFieldError(field);
        },
        [handleClearFieldError]
    );

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
        initialRoute: initialData?.plannedRoute as FlightLineStringGeometry | string | null,
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
                feasibilityOverride: t("validation.overrideReasonRequired"),
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
                          name: t("editor.departureWpName", {
                              hub: selectedDepHub.name || selectedDepHub.code || "Hub",
                          }),
                          latitude: selectedDepHub.location.latitude,
                          longitude: selectedDepHub.location.longitude,
                          altitude: selectedDepHub.altitudeMsl ?? 0,
                          actions: { type: WAYPOINT_ACTION_TYPE.TAKEOFF },
                      },
                  ]
                : []),
            ...waypoints.map((wp, idx) => ({
                sequence: (selectedDepHub?.location ? 2 : 1) + idx,
                name:
                    wp.name?.trim() ||
                    tWp("defaultWaypointName", {
                        seq: (selectedDepHub?.location ? 2 : 1) + idx,
                    }),
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
                          name: t("editor.arrivalWpName", {
                              hub: selectedArrHub.name || selectedArrHub.code || "Hub",
                          }),
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
    const authStatus: FlightAuthorizationStatus =
        initialData?.authorizationStatus ?? FLIGHT_AUTHORIZATION_STATUS.PENDING;
    const flightLabel = formData.flightNumber || initialData?.flightNumber || initialData?.id || "";

    const invalidateFlightQueries = () => {
        if (initialData?.id) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(initialData.id) });
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
    };

    const authorizeMutation = useMutation({
        mutationFn: () => flightService.authorizeFlight(initialData!.id),
        onSuccess: () => {
            toast.success(t("toasts.authorized", { flight: flightLabel }));
            invalidateFlightQueries();
        },
        meta: { defaultErrorMessage: t("toasts.authorizeFailed") },
    });

    const startMutation = useMutation({
        mutationFn: () => flightService.startFlight(initialData!.id),
        onSuccess: () => {
            toast.success(t("toasts.started", { flight: flightLabel }));
            invalidateFlightQueries();
        },
        meta: { defaultErrorMessage: t("toasts.startFailed") },
    });

    const completeMutation = useMutation({
        mutationFn: () => flightService.completeFlight(initialData!.id),
        onSuccess: () => {
            toast.success(t("toasts.completed", { flight: flightLabel }));
            invalidateFlightQueries();
        },
        meta: { defaultErrorMessage: t("toasts.completeFailed") },
    });

    const abortMutation = useMutation({
        mutationFn: () => flightService.abortFlight(initialData!.id),
        onSuccess: () => {
            toast.success(t("toasts.aborted", { flight: flightLabel }));
            setConfirmAbortOpen(false);
            invalidateFlightQueries();
        },
        meta: { defaultErrorMessage: t("toasts.abortFailed") },
    });

    const isLifecyclePending =
        authorizeMutation.isPending ||
        startMutation.isPending ||
        completeMutation.isPending ||
        abortMutation.isPending;

    const canAuthorizeNow = Boolean(
        mode === "edit" &&
        initialData?.id &&
        canAuthorizeFlight &&
        (flightStatus === FLIGHT_STATUS.PLANNED || flightStatus === FLIGHT_STATUS.SCHEDULED) &&
        authStatus === FLIGHT_AUTHORIZATION_STATUS.PENDING
    );
    const canStartNow = Boolean(
        mode === "edit" && initialData?.id && flightStatus === FLIGHT_STATUS.AUTHORIZED
    );
    const canCompleteOrAbortNow = Boolean(
        mode === "edit" && initialData?.id && ACTIVE_FLIGHT_STATUSES.includes(flightStatus)
    );

    const pageTitle =
        mode === "create"
            ? t("editor.newTitle")
            : isReadOnly
              ? t("editor.viewTitle", {
                    flight: formData.flightNumber || initialData?.flightNumber || "",
                })
              : t("editor.editTitle", {
                    flight: formData.flightNumber || initialData?.flightNumber || "",
                });

    return (
        <>
            <SplitMapLayout
                title={pageTitle}
                badges={mode === "edit" ? <StatusBadge status={flightStatus} showDot /> : null}
                headerActions={
                    <div className="flex flex-wrap items-center gap-2">
                        {mode === "edit" && initialData?.id && onBackToReplay && (
                            <ChamferButton
                                variant="dark"
                                size="sm"
                                clip="sm"
                                onClick={onBackToReplay}
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-white" />
                                <span>{td("backToReplay")}</span>
                            </ChamferButton>
                        )}

                        {mode === "edit" &&
                            initialData?.id &&
                            CONTROLLABLE_FLIGHT_STATUSES.includes(flightStatus) && (
                                <ChamferButton
                                    href={`/dashboard/flights/${initialData.id}/cockpit`}
                                    variant="dark"
                                    size="sm"
                                    clip="sm"
                                >
                                    <Radio className="w-3.5 h-3.5 text-white" />
                                    <span>{td("enterCockpit")}</span>
                                    <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                                </ChamferButton>
                            )}

                        {mode === "edit" && initialData?.id && (
                            <ChamferButton
                                variant="outline"
                                size="sm"
                                clip="xs"
                                onClick={() => setBriefingOpen(true)}
                            >
                                <FileSearch className="w-3.5 h-3.5 text-current" />
                                <span>{t("editor.briefing")}</span>
                            </ChamferButton>
                        )}

                        {canAuthorizeNow && (
                            <ChamferButton
                                variant="outline"
                                size="sm"
                                clip="xs"
                                onClick={() => authorizeMutation.mutate()}
                                disabled={isLifecyclePending || submitting}
                            >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>
                                    {authorizeMutation.isPending
                                        ? t("editor.authorizing")
                                        : t("editor.authorize")}
                                </span>
                            </ChamferButton>
                        )}

                        {canStartNow && (
                            <ChamferButton
                                variant="outline"
                                size="sm"
                                clip="xs"
                                onClick={() => startMutation.mutate()}
                                disabled={isLifecyclePending || submitting}
                            >
                                <Play className="w-3.5 h-3.5 text-emerald-600" />
                                <span>
                                    {startMutation.isPending
                                        ? t("editor.starting")
                                        : t("editor.startFlight")}
                                </span>
                            </ChamferButton>
                        )}

                        {canCompleteOrAbortNow && (
                            <>
                                <ChamferButton
                                    variant="outline"
                                    size="sm"
                                    clip="xs"
                                    onClick={() => completeMutation.mutate()}
                                    disabled={isLifecyclePending}
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>{t("editor.complete")}</span>
                                </ChamferButton>
                                <ChamferButton
                                    variant="outline"
                                    size="sm"
                                    clip="xs"
                                    onClick={() => setConfirmAbortOpen(true)}
                                    disabled={isLifecyclePending}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                    <span>{t("editor.abort")}</span>
                                </ChamferButton>
                            </>
                        )}

                        <ChamferButton
                            variant="outline"
                            size="sm"
                            clip="xs"
                            onClick={() => router.push("/dashboard/flights")}
                            disabled={submitting || isLifecyclePending}
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-current" />
                            <span>{isReadOnly ? tCommon("back") : tCommon("cancel")}</span>
                        </ChamferButton>

                        {!isReadOnly && (
                            <ChamferButton
                                variant="dark"
                                size="sm"
                                clip="sm"
                                onClick={handleSave}
                                disabled={submitting || loading || isLifecyclePending}
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                                ) : (
                                    <Save className="w-4 h-4 text-white" />
                                )}
                                <span>
                                    {mode === "create"
                                        ? t("editor.saveFlight")
                                        : t("editor.updatePlan")}
                                </span>
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
                        onCruisingAltitudeChange={(alt) =>
                            handleFormChange("cruisingAltitudeM", alt)
                        }
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
                        flightId={mode === "edit" ? initialData?.id : undefined}
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

            <PreFlightBriefingModal
                isOpen={briefingOpen}
                flightId={initialData?.id}
                flightNumber={formData.flightNumber || initialData?.flightNumber}
                onClose={() => setBriefingOpen(false)}
            />

            <ConfirmDialog
                isOpen={confirmAbortOpen}
                onClose={() => setConfirmAbortOpen(false)}
                onConfirm={() => abortMutation.mutate()}
                title={t("editor.abortActiveTitle")}
                description={t("editor.abortActiveDesc", { flight: flightLabel })}
                confirmText={t("abortDialog.confirm")}
                loading={abortMutation.isPending}
            />
        </>
    );
}
