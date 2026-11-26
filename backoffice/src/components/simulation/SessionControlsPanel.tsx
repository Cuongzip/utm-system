"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Square, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, ConfirmDialog } from "@/components/ui";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS } from "@/hooks";
import { SIMULATION_STATUS, type SimulationSession } from "@/types";

export interface SessionControlsPanelProps {
    session: SimulationSession;
    onRefresh: () => void;
}

const TIME_SCALE_OPTIONS = [1, 2, 5, 10] as const;

export function SessionControlsPanel({ session, onRefresh }: SessionControlsPanelProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const sessionId = session.id;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === SIMULATION_STATUS.RUNNING;
    const isPaused = normStatus === SIMULATION_STATUS.PAUSED;
    const isStopped =
        normStatus === SIMULATION_STATUS.STOPPED || normStatus === SIMULATION_STATUS.COMPLETED;
    const currentTimeScale = session.timeScale ?? 1.0;

    const updateTimeScaleMutation = useMutation({
        mutationFn: (timeScale: number) => simulationService.updateTimeScale(sessionId, timeScale),
        onSuccess: (updated) => {
            toast.success(`Time-scale updated to ${updated.timeScale ?? 1}x`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh();
        },
        meta: { defaultErrorMessage: "Failed to update time-scale" },
    });

    const pauseMutation = useMutation({
        mutationFn: () => simulationService.pauseSession(sessionId),
        onSuccess: () => {
            toast.success("Simulation paused");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh();
        },
        meta: { defaultErrorMessage: "Failed to pause simulation" },
    });

    const resumeMutation = useMutation({
        mutationFn: () => simulationService.resumeSession(sessionId),
        onSuccess: () => {
            toast.success("Simulation resumed");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh();
        },
        meta: { defaultErrorMessage: "Failed to resume simulation" },
    });

    const stopMutation = useMutation({
        mutationFn: () => simulationService.stopSession(sessionId),
        onSuccess: () => {
            toast.success("Simulation stopped");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh();
        },
        meta: { defaultErrorMessage: "Failed to stop simulation" },
    });

    const deleteMutation = useMutation({
        mutationFn: () => simulationService.deleteSession(sessionId),
        onSuccess: () => {
            toast.success("Simulation session deleted successfully");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            router.push("/dashboard/simulation");
        },
        meta: { defaultErrorMessage: "Failed to delete simulation session" },
    });

    return (
        <>
            <div className="flex flex-wrap items-center gap-2">
                <div
                    role="group"
                    aria-label="Simulation speed factor"
                    className="inline-flex items-center bg-[var(--color-surface-panel)] p-0.5 rounded-md border border-[var(--color-border-default)]"
                >
                    {TIME_SCALE_OPTIONS.map((scale) => {
                        const isSelected = Math.abs(currentTimeScale - scale) < 0.1;
                        const isPending =
                            updateTimeScaleMutation.isPending &&
                            updateTimeScaleMutation.variables === scale;

                        return (
                            <button
                                key={scale}
                                type="button"
                                disabled={!isRunning || updateTimeScaleMutation.isPending}
                                onClick={() => updateTimeScaleMutation.mutate(scale)}
                                className={`px-2.5 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                    isSelected
                                        ? "bg-slate-900 text-white"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                }`}
                            >
                                {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                <span>{scale}x</span>
                            </button>
                        );
                    })}
                </div>

                {isRunning && (
                    <ChamferButton
                        size="sm"
                        variant="dark"
                        clip="xs"
                        disabled={pauseMutation.isPending}
                        onClick={() => pauseMutation.mutate()}
                    >
                        {pauseMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Pause className="w-3.5 h-3.5" />
                        )}
                        <span>Pause</span>
                    </ChamferButton>
                )}

                {isPaused && (
                    <ChamferButton
                        size="sm"
                        variant="dark"
                        clip="xs"
                        disabled={resumeMutation.isPending}
                        onClick={() => resumeMutation.mutate()}
                    >
                        {resumeMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Play className="w-3.5 h-3.5" />
                        )}
                        <span>Resume</span>
                    </ChamferButton>
                )}

                {!isStopped && (
                    <ChamferButton
                        variant="outline"
                        size="sm"
                        clip="xs"
                        disabled={stopMutation.isPending}
                        onClick={() => stopMutation.mutate()}
                    >
                        {stopMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Square className="w-3.5 h-3.5" />
                        )}
                        <span>Stop</span>
                    </ChamferButton>
                )}

                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    disabled={deleteMutation.isPending}
                    onClick={() => setShowDeleteConfirm(true)}
                    title="Delete simulation session"
                >
                    {deleteMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete</span>
                </ChamferButton>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="Delete Simulation Session"
                description={`Are you sure you want to permanently delete session SIM-${sessionId.slice(0, 8).toUpperCase()}? This will stop any active simulation and erase session history.`}
                confirmText="Delete Session"
                loading={deleteMutation.isPending}
            />
        </>
    );
}
