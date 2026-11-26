"use client";

import { useMemo, useState } from "react";
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
import { missionService } from "@/services/missionService";
import { formatDistance } from "@/utils";
import {
    EXECUTION_MODE,
    EXECUTION_MODES,
    EXECUTION_MODE_LABELS,
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

const DISPATCH_OPTIONS = [
    { value: "auto", label: "Auto-Assign Best Drone" },
    { value: "manual", label: "Manual Drone Selection" },
];

const EXECUTION_MODE_OPTIONS = EXECUTION_MODES.map((mode) => ({
    value: mode,
    label: EXECUTION_MODE_LABELS[mode],
}));

function formatCandidateLabel(c: ScoredDroneCandidate): string {
    const name = c.registrationNumber || c.model || c.droneId.slice(0, 8);
    const score = c.finalScore != null ? `${Math.round(c.finalScore)} pts` : "";
    const margin =
        c.batteryMarginPct != null
            ? `${c.batteryMarginPct >= 0 ? "+" : ""}${Math.round(c.batteryMarginPct)}% margin`
            : "";
    const meta = [score, margin].filter(Boolean).join(" · ");
    if (c.eligible === false) {
        return `${name} (Ineligible${c.ineligibilityReason ? `: ${c.ineligibilityReason}` : ""})`;
    }
    return meta ? `${name} · ${meta}` : name;
}

function cleanAirspaceWarning(raw: string): string {
    const withoutPrefix = raw.replace(/^\[[^\]]+\]\s*/, "").trim();
    const colonIdx = withoutPrefix.indexOf(":");
    if (colonIdx > 0) {
        const zoneName = withoutPrefix.slice(0, colonIdx).trim();
        const detail = withoutPrefix.slice(colonIdx + 1).trim();
        if (detail.toLowerCase().includes("intersects")) {
            return `Restricted zone: ${zoneName}`;
        }
        if (detail.toLowerCase().includes("below floor")) {
            const floorVal = detail.match(/\(([^)]+)\)/)?.[1];
            return `Below corridor floor${floorVal ? ` (${floorVal})` : ""}: ${zoneName}`;
        }
        return `${zoneName}: ${detail}`;
    }
    return withoutPrefix;
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
        if (!isMultiLeg) return list;
        return list.filter((w) => !/^Leg \d+ has restricted airspace violations$/i.test(w.trim()));
    }, [plan?.warnings, isMultiLeg]);

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
            toast.success(`Mission launched with ${legCount} flight leg(s)`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missionDetail(mission.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missionExecutions(mission.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
            onExecuted?.();
            onClose();
        },
        meta: { defaultErrorMessage: "Failed to launch mission execution" },
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
                  label: formatCandidateLabel(c),
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
            title={`Execute Mission${mission.code ? `: ${mission.code}` : ""}`}
            maxWidth="540px"
            onSubmit={handleLaunch}
            loading={executeMutation.isPending}
            submitText="Launch Mission"
            loadingText="Launching..."
        >
            {planLoading && !plan ? (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label="Calculating execution plan"
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
                    <span className="sr-only">Calculating execution plan...</span>
                </div>
            ) : planError || !plan ? (
                <div className="p-3 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-xs text-slate-600">
                    Dry-run preview unavailable. Launch will proceed with server-side fleet
                    dispatch.
                </div>
            ) : (
                <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--color-border-default)]">
                        <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-800">
                            EXECUTION PREVIEW · {plan.totalLegs} LEG{plan.totalLegs > 1 ? "S" : ""}
                        </span>
                        <StatusBadge
                            status={
                                plan.feasible
                                    ? FEASIBILITY_VERDICT.GO
                                    : FEASIBILITY_VERDICT.MARGINAL
                            }
                            label={plan.feasible ? "FEASIBLE" : "REVIEW REQUIRED"}
                        />
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-[var(--color-border-default)] font-mono text-xs">
                        <div className="pr-3">
                            <span className="text-[10px] text-slate-500 uppercase block">
                                Distance
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                                {formatDistance(plan.totalDistanceMeters, 2)}
                            </span>
                        </div>
                        <div className="px-3">
                            <span className="text-[10px] text-slate-500 uppercase block">
                                Est. Duration
                            </span>
                            <span className="font-bold text-slate-900 tabular-nums">
                                ~{durationMinutes} min
                            </span>
                        </div>
                        <div className="pl-3">
                            <span className="text-[10px] text-slate-500 uppercase block">
                                Est. Energy
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
                        Drone Assignment
                    </label>
                    <CustomSelect
                        id="dispatchMode"
                        value={autoAssign ? "auto" : "manual"}
                        onValueChange={(val) => setAutoAssign(val === "auto")}
                        options={DISPATCH_OPTIONS}
                    />
                    {autoAssign && topCandidate && !isRelayMode && (
                        <span className="text-[11px] font-mono text-slate-500 truncate">
                            Best: {topCandidate.registrationNumber || topCandidate.model}
                            {topCandidate.finalScore != null
                                ? ` (${Math.round(topCandidate.finalScore)} pts)`
                                : ""}
                        </span>
                    )}
                </div>

                {isMultiLeg && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="executionMode">
                            Multi-Leg Mode
                        </label>
                        <CustomSelect
                            id="executionMode"
                            value={executionMode}
                            onValueChange={(val) => setExecutionModeOverride(val as ExecutionMode)}
                            options={EXECUTION_MODE_OPTIONS}
                        />
                    </div>
                )}
            </div>

            {!autoAssign && !isRelayMode && (
                <div className="form-group">
                    <label className="form-label" htmlFor="executeDroneSelect">
                        Assigned Drone <span className="text-red-500">*</span>
                    </label>
                    <CustomSelect
                        id="executeDroneSelect"
                        value={selectedDroneId}
                        onValueChange={setSelectedDroneId}
                        options={singleLegDroneOptions}
                        placeholder="Select an available drone..."
                    />
                </div>
            )}

            <FormInput
                id="executePilotId"
                label="Remote Pilot ID"
                required
                value={pilotId}
                onChange={(e) => setPilotIdOverride(e.target.value)}
                placeholder="e.g. PILOT-VN-007"
            />

            {showAutoSplitToggle && (
                <div className="px-3.5 py-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 block">
                            Auto-Split via Active Charging Hubs
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                            Inserts charging stopovers when route exceeds battery range
                        </span>
                    </div>
                    <Switch
                        checked={autoSplitByRange}
                        onCheckedChange={setAutoSplitByRange}
                        aria-label="Auto-split via charging hubs"
                    />
                </div>
            )}

            {plan?.legs && plan.legs.length > 0 && (isMultiLeg || !plan.legs[0].airspaceSafe) && (
                <div className="form-group">
                    <label className="form-label">Flight Legs ({plan.legs.length})</label>
                    <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] divide-y divide-[var(--color-border-default)] max-h-48 overflow-y-auto">
                        {plan.legs.map((leg) => {
                            const depCode = leg.departureHubId
                                ? hubCodeMap.get(leg.departureHubId)
                                : null;
                            const arrCode = leg.arrivalHubId
                                ? hubCodeMap.get(leg.arrivalHubId)
                                : null;
                            const fullRouteTitle = `${leg.departureHubName || depCode || "Origin"} → ${leg.arrivalHubName || arrCode || "Destination"}`;
                            const stopoverSuffix =
                                leg.stopoverType &&
                                leg.stopoverType !== STOPOVER_TYPE.NONE &&
                                leg.groundTimeMinutes != null &&
                                leg.groundTimeMinutes > 0
                                    ? ` · +${leg.groundTimeMinutes}m`
                                    : "";
                            const legWarnings = (leg.airspaceWarnings ?? []).map(
                                cleanAirspaceWarning
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
                                                {depCode || leg.departureHubName || "Origin"}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="font-semibold text-slate-900 truncate">
                                                {arrCode || leg.arrivalHubName || "Destination"}
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
                                                <p>• Restricted airspace violation</p>
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
                                                    label: "Auto-select best for this leg",
                                                },
                                                ...(leg.candidateDrones?.length
                                                    ? leg.candidateDrones.map((c) => ({
                                                          value: c.droneId,
                                                          label: formatCandidateLabel(c),
                                                      }))
                                                    : drones.map((d) => ({
                                                          value: d.id,
                                                          label:
                                                              d.registrationNumber ||
                                                              d.model ||
                                                              d.id,
                                                      }))),
                                            ]}
                                            placeholder="Select drone for this leg..."
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
