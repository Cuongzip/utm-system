"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomSelect, FormInput, Modal, Switch } from "@/components/ui";
import {
    QUERY_KEYS,
    useCurrentUser,
    useDronesAll,
    useHubsAll,
    useMissionExecutionPlan,
} from "@/hooks";
import { useAppLocale } from "@/i18n";
import { missionService } from "@/services/missionService";
import { localizeServerText } from "@/utils";
import {
    EXECUTION_MODE,
    EXECUTION_MODES,
    type ExecuteMissionPayload,
    type ExecutionMode,
    type Mission,
} from "@/types";
import { detectRangeShortfall, formatCandidateLabel } from "./execute/executeMissionPlanUtils";
import { ExecutionPlanSummaryCard } from "./execute/ExecutionPlanSummaryCard";
import { ExecutionLegsList } from "./execute/ExecutionLegsList";

interface ExecuteMissionModalProps {
    isOpen: boolean;
    mission: Mission | null;
    defaultDroneId?: string;
    onClose: () => void;
}

interface ExecuteMissionModalBodyProps {
    mission: Mission;
    defaultDroneId?: string;
    onClose: () => void;
}

function ExecuteMissionModalBody({
    mission,
    defaultDroneId,
    onClose,
}: ExecuteMissionModalBodyProps) {
    const t = useTranslations("missions");
    const locale = useAppLocale();
    const queryClient = useQueryClient();
    const { data: currentUser } = useCurrentUser();
    const { data: drones = [] } = useDronesAll();
    const { data: hubs = [] } = useHubsAll();

    const [autoAssign, setAutoAssign] = useState(!defaultDroneId);
    const [executionModeOverride, setExecutionModeOverride] = useState<ExecutionMode | null>(null);
    const [selectedDroneId, setSelectedDroneId] = useState(defaultDroneId || "");
    const [legDroneIds, setLegDroneIds] = useState<Record<number, string>>({});
    const [autoSplitByRange, setAutoSplitByRange] = useState(false);
    const [pilotIdOverride, setPilotIdOverride] = useState<string | null>(null);

    const { data: basePlan } = useMissionExecutionPlan(mission.id, Boolean(mission.id), false);
    const {
        data: activePlan,
        isLoading: planLoading,
        isError: planError,
    } = useMissionExecutionPlan(mission.id, Boolean(mission.id), autoSplitByRange);

    const plan = activePlan ?? basePlan;

    const dispatchOptions = useMemo(
        () => [
            { value: "auto", label: t("executeModal.dispatchAuto") },
            { value: "manual", label: t("executeModal.dispatchManual") },
        ],
        [t]
    );

    const executionModeOptions = useMemo(
        () =>
            EXECUTION_MODES.map((mode) => ({
                value: mode,
                label: t(`executeModal.modes.${mode}`),
            })),
        [t]
    );

    const hubCodeMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const h of hubs) {
            if (h.id && h.code) {
                map.set(h.id, h.code);
            }
        }
        return map;
    }, [hubs]);

    const executionMode: ExecutionMode =
        executionModeOverride ?? plan?.recommendedMode ?? EXECUTION_MODE.SAME_DRONE_SEQUENTIAL;
    const pilotId = pilotIdOverride ?? (currentUser?.username || currentUser?.email || "operator");

    const isMultiLeg = (plan?.totalLegs ?? 1) > 1;
    const isRelayMode = isMultiLeg && executionMode === EXECUTION_MODE.MULTI_DRONE_RELAY;

    const showAutoSplitToggle = useMemo(
        () => autoSplitByRange || detectRangeShortfall(basePlan ?? plan),
        [autoSplitByRange, basePlan, plan]
    );

    const globalSummaryWarnings = useMemo(() => {
        const list = plan?.warnings ?? [];
        const filtered = isMultiLeg
            ? list.filter((w) => !/^Leg \d+ has restricted airspace violations$/i.test(w.trim()))
            : list;
        return filtered.map((w) => localizeServerText(w, locale));
    }, [plan?.warnings, isMultiLeg, locale]);

    const primaryCandidates = useMemo(() => plan?.legs?.[0]?.candidateDrones ?? [], [plan]);
    const topCandidate = useMemo(
        () => primaryCandidates.find((c) => c.eligible !== false) ?? primaryCandidates[0] ?? null,
        [primaryCandidates]
    );

    const executeMutation = useMutation({
        mutationFn: (payload: ExecuteMissionPayload) =>
            missionService.executeMission(mission.id, payload),
        onSuccess: (data) => {
            const legCount = data?.flights?.length || (data?.flight ? 1 : 0);
            toast.success(t("toasts.launched", { count: legCount }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missionDetail(mission.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missionExecutions(mission.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
            onClose();
        },
        meta: { defaultErrorMessage: t("toasts.launchFailed") },
    });

    const handleLaunch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const effectivePilotId = pilotId.trim() || currentUser?.username || "operator";
        const payload: ExecuteMissionPayload = {
            pilotId: effectivePilotId,
            autoAssign,
            executionMode: isMultiLeg ? executionMode : EXECUTION_MODE.SAME_DRONE_SEQUENTIAL,
            autoSplitByRange: autoSplitByRange || undefined,
        };

        if (!autoAssign) {
            if (isRelayMode && plan?.legs) {
                const assignments = plan.legs
                    .map((leg) => {
                        const assignedId =
                            legDroneIds[leg.legIndex] ||
                            leg.candidateDrones?.find((c) => c.eligible !== false)?.droneId;
                        return assignedId ? { legIndex: leg.legIndex, droneId: assignedId } : null;
                    })
                    .filter((item): item is { legIndex: number; droneId: string } => item !== null);
                payload.legAssignments = assignments;
            } else if (selectedDroneId) {
                payload.droneId = selectedDroneId;
            }
        }

        executeMutation.mutate(payload);
    };

    const singleLegDroneOptions =
        primaryCandidates.length > 0
            ? primaryCandidates.map((c) => ({
                  value: c.droneId,
                  label: formatCandidateLabel(c, t, locale),
              }))
            : drones.map((d) => ({
                  value: d.id,
                  label: `${d.registrationNumber || d.model || d.id}`,
              }));

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={
                mission.code
                    ? t("executeModal.titleWithCode", { code: mission.code })
                    : t("executeModal.title")
            }
            maxWidth="540px"
            onSubmit={handleLaunch}
            loading={executeMutation.isPending}
            submitText={t("executeModal.submit")}
            loadingText={t("executeModal.launching")}
        >
            <ExecutionPlanSummaryCard
                plan={plan}
                planLoading={planLoading}
                planError={planError}
                globalSummaryWarnings={globalSummaryWarnings}
            />

            <div className={isMultiLeg ? "form-row-2" : "space-y-3"}>
                <div className="form-group">
                    <label className="form-label" htmlFor="dispatchMode">
                        {t("executeModal.droneAssignment")}
                    </label>
                    <CustomSelect
                        id="dispatchMode"
                        value={autoAssign ? "auto" : "manual"}
                        onValueChange={(val) => setAutoAssign(val === "auto")}
                        options={dispatchOptions}
                    />
                    {autoAssign && topCandidate && !isRelayMode && (
                        <span className="text-[11px] font-mono text-slate-500 truncate">
                            {t("executeModal.bestCandidate", {
                                name: `${topCandidate.registrationNumber || topCandidate.model || ""}${
                                    topCandidate.finalScore != null
                                        ? ` (${t("executeModal.pts", { score: Math.round(topCandidate.finalScore) })})`
                                        : ""
                                }`,
                            })}
                        </span>
                    )}
                </div>

                {isMultiLeg && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="executionMode">
                            {t("executeModal.multiLegMode")}
                        </label>
                        <CustomSelect
                            id="executionMode"
                            value={executionMode}
                            onValueChange={(val) => setExecutionModeOverride(val as ExecutionMode)}
                            options={executionModeOptions}
                        />
                    </div>
                )}
            </div>

            {!autoAssign && !isRelayMode && (
                <div className="form-group">
                    <label className="form-label" htmlFor="executeDroneSelect">
                        {t("executeModal.assignedDrone")} <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="executeDroneSelect"
                        value={selectedDroneId}
                        onValueChange={setSelectedDroneId}
                        options={singleLegDroneOptions}
                        placeholder={t("executeModal.selectAvailableDrone")}
                    />
                </div>
            )}

            <FormInput
                id="executePilotId"
                label={t("executeModal.remotePilotId")}
                required
                value={pilotId}
                onChange={(e) => setPilotIdOverride(e.target.value)}
                placeholder={t("executeModal.pilotPlaceholder")}
            />

            {showAutoSplitToggle && (
                <div className="px-3.5 py-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 block">
                            {t("executeModal.autoSplitTitle")}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                            {t("executeModal.autoSplitDesc")}
                        </span>
                    </div>
                    <Switch
                        checked={autoSplitByRange}
                        onCheckedChange={setAutoSplitByRange}
                        aria-label={t("executeModal.autoSplitAria")}
                    />
                </div>
            )}

            {plan?.legs && plan.legs.length > 0 && (isMultiLeg || !plan.legs[0].airspaceSafe) && (
                <ExecutionLegsList
                    legs={plan.legs}
                    hubCodeMap={hubCodeMap}
                    drones={drones}
                    isRelayMode={isRelayMode}
                    autoAssign={autoAssign}
                    legDroneIds={legDroneIds}
                    onSelectLegDrone={(legIndex, droneId) =>
                        setLegDroneIds((prev) => ({ ...prev, [legIndex]: droneId }))
                    }
                />
            )}
        </Modal>
    );
}

export function ExecuteMissionModal({
    isOpen,
    mission,
    defaultDroneId,
    onClose,
}: ExecuteMissionModalProps) {
    if (!isOpen || !mission) return null;

    return (
        <ExecuteMissionModalBody
            key={`${mission.id}-${defaultDroneId || ""}`}
            mission={mission}
            defaultDroneId={defaultDroneId}
            onClose={onClose}
        />
    );
}
