"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, Pause, Play, Square } from "lucide-react";
import {
    AutoGenInput,
    ChamferButton,
    ConfirmDialog,
    CustomSelect,
    FormInput,
    StatusBadge,
    type SelectOption,
} from "@/components/ui";
import { QUERY_KEYS, useFlightsAll, useMissionExecutions } from "@/hooks";
import { missionService } from "@/services/missionService";
import { cn } from "@/lib";
import { MISSION_EXECUTION_STATUS, type Flight, type MissionFormPayload } from "@/types";

export interface MissionDetailsTabProps {
    missionId?: string;
    formData: MissionFormPayload;
    onFormChange: <K extends keyof MissionFormPayload>(
        field: K,
        value: MissionFormPayload[K]
    ) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    droneOptions: SelectOption[];
    hubOptions: SelectOption[];
    arrivalHubOptions: SelectOption[];
    isEdit: boolean;
    isReadOnly: boolean;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

export function MissionDetailsTab({
    missionId,
    formData,
    onFormChange,
    droneId,
    onDroneIdChange,
    droneOptions,
    hubOptions,
    arrivalHubOptions,
    isEdit = false,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionDetailsTabProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const [confirmAbortOpen, setConfirmAbortOpen] = useState(false);

    const { data: executions = [] } = useMissionExecutions(missionId, isEdit && Boolean(missionId));
    const { data: allFlights = [] } = useFlightsAll();

    const flightMap = useMemo(() => {
        const map = new Map<string, Flight>();
        for (const f of allFlights) {
            if (f.id) map.set(f.id, f);
        }
        return map;
    }, [allFlights]);

    const latestExecution = executions[0] ?? null;
    const latestExecStatus = (latestExecution?.status || "").toLowerCase();
    const canPauseExec = latestExecStatus === MISSION_EXECUTION_STATUS.IN_PROGRESS;
    const canResumeExec = latestExecStatus === MISSION_EXECUTION_STATUS.PAUSED;
    const canAbortExec = canPauseExec || canResumeExec;

    const effectiveDroneValue = droneId || latestExecution?.primaryDroneId || "";

    const invalidateExecutionQueries = () => {
        if (missionId) {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missionDetail(missionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missionExecutions(missionId) });
        }
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
    };

    const pauseMutation = useMutation({
        mutationFn: (executionId: string) => missionService.pauseExecution(executionId),
        onSuccess: () => {
            toast.success("Mission execution paused");
            invalidateExecutionQueries();
        },
        meta: { defaultErrorMessage: "Failed to pause execution" },
    });

    const resumeMutation = useMutation({
        mutationFn: (executionId: string) => missionService.resumeExecution(executionId),
        onSuccess: () => {
            toast.success("Mission execution resumed");
            invalidateExecutionQueries();
        },
        meta: { defaultErrorMessage: "Failed to resume execution" },
    });

    const abortMutation = useMutation({
        mutationFn: (executionId: string) => missionService.abortExecution(executionId),
        onSuccess: () => {
            toast.success("Mission execution aborted");
            setConfirmAbortOpen(false);
            invalidateExecutionQueries();
        },
        meta: { defaultErrorMessage: "Failed to abort execution" },
    });

    const isControlPending =
        pauseMutation.isPending || resumeMutation.isPending || abortMutation.isPending;

    return (
        <div className="space-y-4">
            <AutoGenInput
                id="missionCode"
                label="Code"
                showAutoGen={!isEdit}
                disabled={isEdit || isReadOnly}
                required
                manualPlaceholder="e.g. MSN-HAN01"
                value={formData.code ?? ""}
                onChange={(e) => {
                    onFormChange("code", e.target.value);
                    onClearFieldError("code");
                }}
                error={fieldErrors.code}
            />

            <FormInput
                id="missionName"
                label="Mission Name"
                required
                placeholder="Enter mission name"
                value={formData.name || ""}
                disabled={isReadOnly}
                onChange={(e) => {
                    onFormChange("name", e.target.value);
                    onClearFieldError("name");
                }}
                error={fieldErrors.name}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="missionDesc">
                    Description
                </label>
                <textarea
                    id="missionDesc"
                    rows={3}
                    placeholder="Optional description"
                    value={formData.description || ""}
                    disabled={isReadOnly}
                    onChange={(e) => onFormChange("description", e.target.value)}
                    className="form-input resize-none"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Assigned Drone</label>
                <CustomSelect
                    value={effectiveDroneValue}
                    disabled={isReadOnly}
                    onValueChange={onDroneIdChange}
                    options={droneOptions}
                    placeholder="Auto-dispatch from fleet (optional)"
                />
            </div>

            <div className="form-group">
                <label className="form-label">
                    Departure Vertiport <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.departureHubId || ""}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onFormChange("departureHubId", val);
                        onClearFieldError("departureHubId");
                    }}
                    options={hubOptions}
                    placeholder="Select departure hub"
                    className={cn(fieldErrors.departureHubId && "form-input-error")}
                />
                {fieldErrors.departureHubId && (
                    <span className="form-error-msg">{fieldErrors.departureHubId}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Arrival Vertiport</label>
                <CustomSelect
                    value={formData.arrivalHubId || ""}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onFormChange("arrivalHubId", val);
                        onClearFieldError("arrivalHubId");
                    }}
                    options={arrivalHubOptions}
                    placeholder="Same as departure"
                    className={cn(fieldErrors.arrivalHubId && "form-input-error")}
                />
                {fieldErrors.arrivalHubId && (
                    <span className="form-error-msg">{fieldErrors.arrivalHubId}</span>
                )}
            </div>

            {latestExecution && (
                <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] overflow-hidden">
                    <div className="px-3 py-2.5 border-b border-[var(--color-border-default)] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-800">
                                Execution ({latestExecution.completedLegs ?? 0}/
                                {latestExecution.totalLegs ?? latestExecution.legs?.length ?? 1}{" "}
                                Legs)
                            </span>
                            <StatusBadge
                                status={
                                    latestExecution.status ?? MISSION_EXECUTION_STATUS.IN_PROGRESS
                                }
                                dotShape="circle"
                            />
                        </div>

                        {(canPauseExec || canResumeExec || canAbortExec) && (
                            <div className="flex items-center gap-1.5">
                                {canPauseExec && (
                                    <ChamferButton
                                        size="xs"
                                        variant="outline"
                                        disabled={isControlPending}
                                        onClick={() => pauseMutation.mutate(latestExecution.id!)}
                                    >
                                        <Pause className="w-3 h-3" />
                                        <span>Pause</span>
                                    </ChamferButton>
                                )}
                                {canResumeExec && (
                                    <ChamferButton
                                        size="xs"
                                        variant="dark"
                                        disabled={isControlPending}
                                        onClick={() => resumeMutation.mutate(latestExecution.id!)}
                                    >
                                        <Play className="w-3 h-3" />
                                        <span>Resume</span>
                                    </ChamferButton>
                                )}
                                {canAbortExec && (
                                    <ChamferButton
                                        size="xs"
                                        variant="outline"
                                        disabled={isControlPending}
                                        onClick={() => setConfirmAbortOpen(true)}
                                    >
                                        <Square className="w-3 h-3 text-slate-600" />
                                        <span>Abort</span>
                                    </ChamferButton>
                                )}
                            </div>
                        )}
                    </div>

                    {latestExecution.legs && latestExecution.legs.length > 0 && (
                        <div className="divide-y divide-[var(--color-border-default)] bg-[var(--color-surface-panel)]">
                            {latestExecution.legs.map((leg) => {
                                const matchedFlight = leg.flightId
                                    ? flightMap.get(leg.flightId)
                                    : undefined;
                                const flightLabel =
                                    matchedFlight?.flightNumber ||
                                    (leg.flightId ? "Assigned Flight" : "Pending");

                                return (
                                    <button
                                        key={leg.id}
                                        type="button"
                                        disabled={!leg.flightId}
                                        onClick={() =>
                                            leg.flightId &&
                                            router.push(`/dashboard/flights/${leg.flightId}`)
                                        }
                                        className="w-full px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer disabled:cursor-default"
                                    >
                                        <div className="font-mono text-xs flex items-center gap-2 min-w-0">
                                            <span className="text-[11px] text-slate-400 font-semibold tabular-nums shrink-0">
                                                L{(leg.legIndex ?? 0) + 1}
                                            </span>
                                            <span className="text-slate-900 font-semibold truncate">
                                                {flightLabel}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <StatusBadge
                                                status={
                                                    matchedFlight?.status ??
                                                    leg.status ??
                                                    MISSION_EXECUTION_STATUS.PENDING
                                                }
                                            />
                                            {leg.flightId && (
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmAbortOpen}
                onClose={() => setConfirmAbortOpen(false)}
                onConfirm={() => {
                    if (latestExecution?.id) {
                        abortMutation.mutate(latestExecution.id);
                    }
                }}
                title="Abort Mission Execution"
                description="This will cancel all pending flight legs and command any airborne leg aircraft to abort immediately."
                confirmText="Abort Mission"
                loading={abortMutation.isPending}
            />
        </div>
    );
}
