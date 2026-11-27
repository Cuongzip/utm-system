"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { CustomSelect, FormInput, Modal, Skeleton, StatusBadge, Switch } from "@/components/ui";
import {
    QUERY_KEYS,
    useCurrentUser,
    useDronesAll,
    useHubsAll,
    useMissionExecutionPlan,
} from "@/hooks";
import { useAppLocale, type AppLocale } from "@/i18n";
import { missionService } from "@/services/missionService";
import { formatDistance, localizeServerText } from "@/utils";
import {
    EXECUTION_MODE,
    EXECUTION_MODES,
    FEASIBILITY_VERDICT,
    STOPOVER_TYPE,
    type ExecuteMissionPayload,
    type ExecutionMode,
    type Mission,
    type MissionExecutionPlan,
    type ScoredDroneCandidate,
} from "@/types";

export interface ExecuteMissionModalProps {
    isOpen: boolean;
    mission: Mission | null;
    defaultDroneId?: string;
    onClose: () => void;
    onExecuted?: () => void;
}

type MissionTranslator = ReturnType<typeof useTranslations<"missions">>;

function formatCandidateLabel(
    c: ScoredDroneCandidate,
    t: MissionTranslator,
    locale: AppLocale
): string {
    const name = c.registrationNumber || c.model || c.droneId.slice(0, 8);
    const score =
        c.finalScore != null ? t("executeModal.pts", { score: Math.round(c.finalScore) }) : "";
    const margin =
        c.batteryMarginPct != null
            ? t("executeModal.marginPct", {
                  sign: c.batteryMarginPct >= 0 ? "+" : "",
                  pct: Math.round(c.batteryMarginPct),
              })
            : "";
    const meta = [score, margin].filter(Boolean).join(" · ");
    if (c.eligible === false) {
        const ineligibleText = c.ineligibilityReason
            ? t("executeModal.ineligibleReason", {
                  reason: localizeServerText(c.ineligibilityReason, locale),
              })
            : t("executeModal.ineligible");
        return `${name} (${ineligibleText})`;
    }
    return meta ? `${name} · ${meta}` : name;
}

function cleanAirspaceWarning(raw: string, t: MissionTranslator, locale: AppLocale): string {
    const withoutPrefix = raw.replace(/^\[[^\]]+\]\s*/, "").trim();
    const colonIdx = withoutPrefix.indexOf(":");
    if (colonIdx > 0) {
        const zoneName = withoutPrefix.slice(0, colonIdx).trim();
        const detail = withoutPrefix.slice(colonIdx + 1).trim();
        if (detail.toLowerCase().includes("intersects")) {
            return t("executeModal.restrictedZone", { zone: zoneName });
        }
        if (detail.toLowerCase().includes("below floor")) {
            const floorVal = detail.match(/\(([^)]+)\)/)?.[1];
            return floorVal
                ? t("executeModal.belowFloorWithVal", { floor: floorVal, zone: zoneName })
                : t("executeModal.belowFloor", { zone: zoneName });
        }
        return localizeServerText(`${zoneName}: ${detail}`, locale);
    }
    return localizeServerText(withoutPrefix, locale);
}

function detectRangeShortfall(plan?: MissionExecutionPlan | null): boolean {
    if (!plan) return false;
    const warningIndicatesBattery = (plan.warnings ?? []).some((w) => {
        const lower = w.toLowerCase();
        return (
            lower.includes("battery") ||
            lower.includes("autosplitbyrange") ||
            lower.includes("charging") ||
            lower.includes("usable")
        );
    });
    if (warningIndicatesBattery) return true;

    return (plan.legs ?? []).some((leg) => {
        if ((leg.recommendedChargingHubs?.length ?? 0) > 0) return true;
        const candidates = leg.candidateDrones ?? [];
        return (
            candidates.length > 0 &&
            candidates.every(
                (c) =>
                    c.eligible === false &&
                    (c.batteryMarginPct != null ? c.batteryMarginPct < 0 : true)
            )
        );
    });
}

interface ExecuteMissionModalBodyProps {
    mission: Mission;
    defaultDroneId?: string;
    onClose: () => void;
    onExecuted?: () => void;
}

function ExecuteMissionModalBody({
    mission,
    defaultDroneId,
    onClose,
    onExecuted,
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
            onExecuted?.();
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

    const durationMinutes = plan ? Math.max(1, Math.round(plan.totalDurationSeconds / 60)) : 0;

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
            {planLoading && !plan ? (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label={t("executeModal.calculating")}
                    className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] p-3.5 space-y-3"
                >
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-default)]">
                        <Skeleton className="h-3.5 w-36" />
                        <Skeleton className="h-5 w-20" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="flex flex-col gap-1.5">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        ))}
                    </div>
                    <span className="sr-only">{t("executeModal.calculating")}</span>
                </div>
            ) : planError || !plan ? (
                <div className="p-3 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-xs text-slate-600">
                    {t("executeModal.previewUnavailable")}
                </div>
            ) : (
                <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border-default)]">
                        <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-800">
                            {plan.totalLegs > 1
                                ? t("executeModal.previewHeaderPlural", { count: plan.totalLegs })
                                : t("executeModal.previewHeaderSingle", { count: plan.totalLegs })}
                        </span>
                        <StatusBadge
                            status={
                                plan.feasible
                                    ? FEASIBILITY_VERDICT.GO
                                    : FEASIBILITY_VERDICT.MARGINAL
                            }
                            label={
                                plan.feasible
                                    ? t("executeModal.feasible")
                                    : t("executeModal.reviewRequired")
                            }
                        />
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-[var(--color-border-default)] font-mono text-xs">
                        <div className="pr-3">
                            <span className="text-[10px] text-slate-500 uppercase block">
                                {t("executeModal.distance")}
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                                {formatDistance(plan.totalDistanceMeters, 2)}
                            </span>
                        </div>
                        <div className="px-3">
                            <span className="text-[10px] text-slate-500 uppercase block">
                                {t("executeModal.estDuration")}
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                                {t("executeModal.minutesShort", { count: durationMinutes })}
                            </span>
                        </div>
                        <div className="pl-3">
                            <span className="text-[10px] text-slate-500 uppercase block">
                                {t("executeModal.estEnergy")}
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                                {Math.round(plan.totalEnergyWh)} Wh
                            </span>
                        </div>
                    </div>

                    {globalSummaryWarnings.length > 0 && (
                        <div className="pt-2 border-t border-[var(--color-border-default)] space-y-1 text-xs text-slate-600">
                            {globalSummaryWarnings.slice(0, 2).map((warn, idx) => (
                                <p key={idx}>{warn}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                <div className="form-group">
                    <label className="form-label">
                        {t("executeModal.flightLegs", { count: plan.legs.length })}
                    </label>
                    <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] divide-y divide-[var(--color-border-default)] max-h-48 overflow-y-auto">
                        {plan.legs.map((leg) => {
                            const depCode = leg.departureHubId
                                ? hubCodeMap.get(leg.departureHubId)
                                : null;
                            const arrCode = leg.arrivalHubId
                                ? hubCodeMap.get(leg.arrivalHubId)
                                : null;
                            const originLabel =
                                leg.departureHubName || depCode || t("executeModal.origin");
                            const destLabel =
                                leg.arrivalHubName || arrCode || t("executeModal.destination");
                            const fullRouteTitle = `${originLabel} → ${destLabel}`;
                            const stopoverSuffix =
                                leg.stopoverType &&
                                leg.stopoverType !== STOPOVER_TYPE.NONE &&
                                leg.groundTimeMinutes != null &&
                                leg.groundTimeMinutes > 0
                                    ? ` · +${leg.groundTimeMinutes}m`
                                    : "";
                            const legWarnings = (leg.airspaceWarnings ?? []).map((w) =>
                                cleanAirspaceWarning(w, t, locale)
                            );

                            return (
                                <div key={leg.legIndex} className="px-3 py-2 flex flex-col gap-1">
                                    <div className="flex items-center justify-between gap-2 text-xs font-mono">
                                        <div
                                            className="flex items-center gap-2 min-w-0"
                                            title={fullRouteTitle}
                                        >
                                            <span className="text-[11px] font-semibold text-slate-400 shrink-0 tabular-nums">
                                                L{leg.legIndex + 1}
                                            </span>
                                            <span className="font-semibold text-slate-900 truncate">
                                                {depCode || originLabel}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="font-semibold text-slate-900 truncate">
                                                {arrCode || destLabel}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 shrink-0 whitespace-nowrap tabular-nums">
                                            {formatDistance(leg.distanceMeters, 1)} ·{" "}
                                            {Math.round(leg.estimatedEnergyWh)} Wh
                                            {stopoverSuffix}
                                        </span>
                                    </div>

                                    {!leg.airspaceSafe && (
                                        <div className="pl-5 text-[11px] text-slate-600 space-y-0.5">
                                            {legWarnings.length > 0 ? (
                                                legWarnings.map((w, wIdx) => (
                                                    <p key={wIdx}>• {w}</p>
                                                ))
                                            ) : (
                                                <p>• {t("executeModal.restrictedViolation")}</p>
                                            )}
                                        </div>
                                    )}

                                    {isRelayMode && !autoAssign && (
                                        <CustomSelect
                                            value={legDroneIds[leg.legIndex] || ""}
                                            onValueChange={(val) =>
                                                setLegDroneIds((prev) => ({
                                                    ...prev,
                                                    [leg.legIndex]: val,
                                                }))
                                            }
                                            options={[
                                                {
                                                    value: "",
                                                    label: t("executeModal.autoSelectLeg"),
                                                },
                                                ...(leg.candidateDrones?.length
                                                    ? leg.candidateDrones.map((c) => ({
                                                          value: c.droneId,
                                                          label: formatCandidateLabel(c, t, locale),
                                                      }))
                                                    : drones.map((d) => ({
                                                          value: d.id,
                                                          label:
                                                              d.registrationNumber ||
                                                              d.model ||
                                                              d.id,
                                                      }))),
                                            ]}
                                            placeholder={t("executeModal.selectLegDrone")}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Modal>
    );
}

export function ExecuteMissionModal({
    isOpen,
    mission,
    defaultDroneId,
    onClose,
    onExecuted,
}: ExecuteMissionModalProps) {
    if (!isOpen || !mission) return null;

    return (
        <ExecuteMissionModalBody
            key={`${mission.id}-${defaultDroneId || ""}`}
            mission={mission}
            defaultDroneId={defaultDroneId}
            onClose={onClose}
            onExecuted={onExecuted}
        />
    );
}
