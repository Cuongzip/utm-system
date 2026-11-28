"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SplitMapLayout, StatusBadge, ConfirmDialog } from "@/components/ui";
import { FlightMapEditor } from "./FlightMapEditor";
import { FlightFormSidebar } from "./FlightFormSidebar";
import { PreFlightBriefingModal } from "./PreFlightBriefingModal";
import { FlightEditorHeaderActions } from "./FlightEditorHeaderActions";
import {
    useFlightRoute,
    type FlightWaypoint,
    type FlightLineStringGeometry,
} from "./useFlightRoute";
import { useFlightLifecycleActions } from "./useFlightLifecycleActions";
import { buildFlightSavePayload, estimateRouteFeasibility } from "./flightUtils";
import { usePermissions } from "@/hooks";
import { clearFieldError } from "@/utils";
import {
    getInitialFlightFormPayload,
    EDITABLE_FLIGHT_STATUSES,
    ACTIVE_FLIGHT_STATUSES,
    DEFAULT_FLIGHT_STATUS,
    FLIGHT_STATUS,
    FLIGHT_AUTHORIZATION_STATUS,
    FEASIBILITY_VERDICT,
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

interface FlightEditorProps {
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
    const tWp = useTranslations("waypoints");
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

    const routeFeasibility = useMemo(
        () => estimateRouteFeasibility(totalDistanceM, selectedDrone),
        [totalDistanceM, selectedDrone]
    );

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

        const built = buildFlightSavePayload({
            mode,
            formData,
            waypoints,
            computedGeoJsonLineString,
            departureHub: selectedDepHub,
            arrivalHub: selectedArrHub,
            feasibilityVerdict: routeFeasibility.verdict,
            labels: {
                departureWpName: (hub) => t("editor.departureWpName", { hub }),
                arrivalWpName: (hub) => t("editor.arrivalWpName", { hub }),
                defaultWaypointName: (seq) => tWp("defaultWaypointName", { seq }),
            },
        });

        if (!built.success) {
            setFieldErrors(built.errors);
            setActiveSidebarTab(built.targetTab);
            return;
        }

        setSubmitting(true);
        try {
            await onSave(built.payload);
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

    const {
        authorizeFlightMutation,
        startFlightMutation,
        completeFlightMutation,
        abortFlightMutation,
        isLifecyclePending,
    } = useFlightLifecycleActions({
        onAborted: () => setConfirmAbortOpen(false),
    });

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
                    <FlightEditorHeaderActions
                        mode={mode}
                        flightId={initialData?.id}
                        flightStatus={flightStatus}
                        isReadOnly={isReadOnly}
                        submitting={submitting}
                        loading={loading}
                        isLifecyclePending={isLifecyclePending}
                        isAuthorizing={authorizeFlightMutation.isPending}
                        isStarting={startFlightMutation.isPending}
                        canAuthorizeNow={canAuthorizeNow}
                        canStartNow={canStartNow}
                        canCompleteOrAbortNow={canCompleteOrAbortNow}
                        onBackToReplay={onBackToReplay}
                        onOpenBriefing={() => setBriefingOpen(true)}
                        onAuthorize={() =>
                            authorizeFlightMutation.mutate({
                                flight: initialData!,
                                label: flightLabel,
                            })
                        }
                        onStart={() =>
                            startFlightMutation.mutate({
                                flight: initialData!,
                                label: flightLabel,
                            })
                        }
                        onComplete={() =>
                            completeFlightMutation.mutate({
                                flight: initialData!,
                                label: flightLabel,
                            })
                        }
                        onRequestAbort={() => setConfirmAbortOpen(true)}
                        onCancelOrBack={() => router.push("/dashboard/flights")}
                        onSave={handleSave}
                    />
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
                onConfirm={() =>
                    abortFlightMutation.mutate({ flight: initialData!, label: flightLabel })
                }
                title={t("editor.abortActiveTitle")}
                description={t("editor.abortActiveDesc", { flight: flightLabel })}
                confirmText={t("abortDialog.confirm")}
                loading={abortFlightMutation.isPending}
            />
        </>
    );
}
