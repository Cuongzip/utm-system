"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Save, Loader2, Play } from "lucide-react";
import { SplitMapLayout, ChamferButton, StatusBadge } from "@/components/ui";
import {
    MissionMapEditor,
    MissionFormSidebar,
    ExecuteMissionModal,
    useMissionWaypoints,
    waypointsValidationSchema,
    sanitizeWaypointForApi,
    syncMissionWaypoints,
    determineActiveTabFromErrors,
} from "@/components/missions";
import { extractIntermediateWaypoints } from "@/components/waypoints";
import { QUERY_KEYS } from "@/hooks";
import { missionService } from "@/services/missionService";
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
    EXECUTABLE_MISSION_STATUSES,
    MISSION_STATUS,
    MISSION_SCHEDULE_TYPE,
    STOPOVER_TYPE,
} from "@/types";

export interface MissionSaveData {
    payload: CreateMissionPayload | UpdateMissionPayload;
    waypoints: Waypoint[];
    persistedWaypoints?: Waypoint[];
    defaultAltitude: number;
    droneId?: string;
}

interface MissionEditorProps {
    mode: "create" | "edit";
    initialData?: Mission | null;
    hubs: Hub[];
    drones: Drone[];
    onSave: (data: MissionSaveData) => Promise<void>;
    loading: boolean;
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
    const t = useTranslations("missions");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();

    const [submitting, setSubmitting] = useState(false);
    const [droneId, setDroneId] = useState(initialData?.droneId || "");
    const [isExecuteOpen, setIsExecuteOpen] = useState(false);

    const [prevMissionId, setPrevMissionId] = useState(initialData?.id);
    const [persistedWaypoints, setPersistedWaypoints] = useState<Waypoint[]>(
        () => initialData?.waypoints ?? []
    );
    const [formData, setFormData] = useState<MissionFormPayload>(() =>
        getInitialMissionFormPayload(initialData)
    );

    if (initialData?.id !== prevMissionId) {
        setPrevMissionId(initialData?.id);
        setFormData(getInitialMissionFormPayload(initialData));
        setDroneId(initialData?.droneId || "");
        setPersistedWaypoints(initialData?.waypoints ?? []);
    }

    const [activeSidebarTab, setActiveSidebarTab] = useState<"details" | "waypoints" | "schedule">(
        "details"
    );
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const handleClearFieldError = (...fields: string[]) =>
        clearFieldError(setFieldErrors, ...fields);

    const isReadOnly = Boolean(
        mode === "edit" && initialData?.status && initialData.status !== MISSION_STATUS.DRAFT
    );

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
        handleAddHubWaypoint,
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

    const autoPlanHubsMutation = useMutation({
        mutationFn: async () => {
            if (!initialData?.id) {
                throw new Error(t("toasts.saveBeforeAutoPlan"));
            }
            const normalizedWaypoints = waypoints.map((wp, idx) => ({
                ...wp,
                sequence: idx + 1,
            }));
            await syncMissionWaypoints(
                initialData.id,
                persistedWaypoints,
                normalizedWaypoints,
                defaultAltitude,
                selectedDepartureHub,
                selectedArrivalHub
            );
            return missionService.autoPlanHubs(initialData.id, {
                droneId: droneId || undefined,
                preferredStopoverType: STOPOVER_TYPE.RECHARGE,
                persist: true,
            });
        },
        onSuccess: (result) => {
            if (Array.isArray(result.waypoints)) {
                const updatedServerWaypoints = result.waypoints as Waypoint[];
                setPersistedWaypoints(updatedServerWaypoints);
                setWaypoints(
                    extractIntermediateWaypoints(
                        updatedServerWaypoints,
                        selectedDepartureHub,
                        selectedArrivalHub
                    )
                );
                setSelectedWaypointId(null);
                onClearWaypointErrors();
                if (initialData?.id) {
                    queryClient.setQueryData(
                        QUERY_KEYS.missionDetail(initialData.id),
                        (old: Mission | undefined) =>
                            old ? { ...old, waypoints: updatedServerWaypoints } : old
                    );
                }
            }
            if (initialData?.id) {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.missionDetail(initialData.id),
                });
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.missionExecutionPlan(initialData.id),
                });
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
            const inserted = result.insertedHubCount ?? 0;
            const legs = result.plannedLegCount ?? 1;
            if (inserted > 0) {
                toast.success(t("toasts.autoPlannedInserted", { count: inserted, legs }));
            } else {
                toast.success(t("toasts.autoPlannedFits", { legs }));
            }
        },
        meta: { defaultErrorMessage: t("toasts.autoPlanFailed") },
    });

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
            droneId: droneId || undefined,
            scheduleType: formData.scheduleType,
            scheduledAt: scheduledIso,
        };

        setFieldErrors({});

        const schema = mode === "create" ? createMissionBody : updateMissionBody;
        const validation = validateSchema(schema, payload);
        const newFieldErrors: Record<string, string> = {};

        if (formData.scheduleType === MISSION_SCHEDULE_TYPE.SCHEDULED) {
            if (!formData.scheduledAt || !formData.scheduledAt.trim()) {
                newFieldErrors.scheduledAt = t("validation.scheduledRequired");
            } else if (new Date(formData.scheduledAt).getTime() <= Date.now()) {
                newFieldErrors.scheduledAt = t("validation.scheduledFuture");
            }
        }

        const routeWaypoints: Waypoint[] = waypoints.map((wp, idx) => ({
            ...wp,
            sequence: idx + 1,
        }));

        const waypointValidation = validateSchema(waypointsValidationSchema, {
            waypoints: routeWaypoints.map((w) => sanitizeWaypointForApi(w, defaultAltitude)),
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
                waypoints: routeWaypoints,
                persistedWaypoints,
                defaultAltitude,
                droneId: droneId || undefined,
            });
        } catch (err: unknown) {
            const parsed = parseApiError(err, t("toasts.saveFailed"));
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

    const canExecute = Boolean(
        mode === "edit" &&
        initialData?.status &&
        EXECUTABLE_MISSION_STATUSES.has(initialData.status)
    );
    const isReExecute = Boolean(
        initialData?.status &&
        (initialData.status === MISSION_STATUS.COMPLETED ||
            initialData.status === MISSION_STATUS.ABORTED ||
            initialData.status === MISSION_STATUS.FAILED)
    );

    const pageTitle =
        mode === "create"
            ? t("editor.newTitle")
            : isReadOnly
              ? t("editor.viewTitle", { name: initialData?.name || "" })
              : t("editor.editTitle", { name: initialData?.name || "" });

    return (
        <>
            <SplitMapLayout
                title={pageTitle}
                badges={
                    mode === "edit" ? (
                        <StatusBadge
                            status={initialData?.status ?? DEFAULT_MISSION_STATUS}
                            showDot
                        />
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
                            <span>{isReadOnly ? tCommon("back") : tCommon("cancel")}</span>
                        </ChamferButton>

                        {canExecute && (
                            <ChamferButton
                                variant="outline"
                                size="sm"
                                clip="xs"
                                onClick={() => setIsExecuteOpen(true)}
                                disabled={submitting || loading}
                            >
                                <Play className="w-3.5 h-3.5 text-slate-700" />
                                <span>
                                    {isReExecute ? t("actions.reExecute") : t("actions.execute")}
                                </span>
                            </ChamferButton>
                        )}

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
                                <span>
                                    {mode === "create"
                                        ? t("editor.saveMission")
                                        : t("editor.updateMission")}
                                </span>
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
                        missionId={initialData?.id}
                        formData={formData}
                        onFormChange={handleFormChange}
                        droneId={droneId}
                        onDroneIdChange={setDroneId}
                        drones={drones}
                        hubs={hubs}
                        departureHub={selectedDepartureHub}
                        arrivalHub={selectedArrivalHub}
                        waypoints={waypoints}
                        selectedWaypoint={selectedWaypoint}
                        onSelectWaypoint={handleSelectWaypoint}
                        onAddHubWaypoint={handleAddHubWaypoint}
                        onUpdateWaypoint={handleUpdateWaypoint}
                        onDeleteWaypoint={handleDeleteWaypoint}
                        onMoveWaypointOrder={handleMoveWaypointOrder}
                        activeTab={activeSidebarTab}
                        onTabChange={setActiveSidebarTab}
                        isEdit={mode === "edit"}
                        isReadOnly={isReadOnly}
                        onAutoPlanHubs={
                            mode === "edit" && initialData?.id && !isReadOnly
                                ? () => autoPlanHubsMutation.mutate()
                                : undefined
                        }
                        isAutoPlanning={autoPlanHubsMutation.isPending}
                        fieldErrors={fieldErrors}
                        onClearFieldError={handleClearFieldError}
                    />
                }
            />

            <ExecuteMissionModal
                isOpen={isExecuteOpen}
                mission={initialData ?? null}
                defaultDroneId={droneId || undefined}
                onClose={() => setIsExecuteOpen(false)}
            />
        </>
    );
}
