"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, Square, Gauge, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChamferCard, OutlineButton, ChamferButton, ConfirmDialog } from "@/components/ui";
import { simulationService } from "@/services/simulationService";
import { QUERY_KEYS } from "@/hooks";
import type { SimulationSession } from "@/types";

export interface SessionControlsPanelProps {
    session: SimulationSession;
    onRefresh?: () => void;
}

const TIME_SCALE_OPTIONS = [1, 2, 5, 10] as const;

export function SessionControlsPanel({ session, onRefresh }: SessionControlsPanelProps) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const sessionId = session.id;

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === "running";
    const isPaused = normStatus === "paused";
    const isStopped = normStatus === "stopped" || normStatus === "completed";
    const currentTimeScale = session.timeScale ?? 1.0;

    const updateTimeScaleMutation = useMutation({
        mutationFn: (timeScale: number) => simulationService.updateTimeScale(sessionId, timeScale),
        onSuccess: (updated) => {
            toast.success(`Time-scale updated to ${updated.timeScale ?? 1}x`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh?.();
        },
        meta: { defaultErrorMessage: "Failed to update time-scale" },
    });

    const pauseMutation = useMutation({
        mutationFn: () => simulationService.pauseSession(sessionId),
        onSuccess: () => {
            toast.success("Simulation paused");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh?.();
        },
        meta: { defaultErrorMessage: "Failed to pause simulation" },
    });

    const resumeMutation = useMutation({
        mutationFn: () => simulationService.resumeSession(sessionId),
        onSuccess: () => {
            toast.success("Simulation resumed");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh?.();
        },
        meta: { defaultErrorMessage: "Failed to resume simulation" },
    });

    const stopMutation = useMutation({
        mutationFn: () => simulationService.stopSession(sessionId),
        onSuccess: () => {
            toast.success("Simulation stopped");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onRefresh?.();
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
            <ChamferCard size="lg" className="w-full">
                <div className="p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Gauge className="w-4 h-4 text-slate-500" />
                            <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
                                SPEED FACTOR:
                            </span>
                        </div>

                        <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
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
                                        className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors flex items-center gap-1 cursor-pointer ${
                                            isSelected
                                                ? "bg-slate-900 text-white shadow-2xs"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 disabled:opacity-50 disabled:cursor-not-allowed"
                                        }`}
                                    >
                                        {isPending ? (
                                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                                        ) : null}
                                        <span>{scale}x</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {isRunning && (
                            <OutlineButton
                                size="sm"
                                disabled={pauseMutation.isPending}
                                onClick={() => pauseMutation.mutate()}
                                className="text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                            >
                                {pauseMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-amber-500" />
                                ) : (
                                    <Pause className="w-3.5 h-3.5 mr-1 text-amber-500" />
                                )}
                                <span>Pause</span>
                            </OutlineButton>
                        )}

                        {isPaused && (
                            <OutlineButton
                                size="sm"
                                disabled={resumeMutation.isPending}
                                onClick={() => resumeMutation.mutate()}
                                className="text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
                            >
                                {resumeMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-emerald-600" />
                                ) : (
                                    <Play className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                )}
                                <span>Resume</span>
                            </OutlineButton>
                        )}

                        {!isStopped && (
                            <ChamferButton
                                variant="danger"
                                size="sm"
                                disabled={stopMutation.isPending}
                                onClick={() => stopMutation.mutate()}
                            >
                                {stopMutation.isPending ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                    <Square className="w-3 h-3 mr-1" />
                                )}
                                <span>Stop</span>
                            </ChamferButton>
                        )}

                        <OutlineButton
                            size="sm"
                            disabled={deleteMutation.isPending}
                            onClick={() => setShowDeleteConfirm(true)}
                            className="text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                            title="Delete simulation session"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-rose-500" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
                            )}
                            <span>Delete</span>
                        </OutlineButton>
                    </div>
                </div>
            </ChamferCard>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="Delete Simulation Session"
                description={`Are you sure you want to permanently delete session "${sessionId}"? This will stop any active simulation and erase session history.`}
                confirmText="Delete Session"
                variant="danger"
                loading={deleteMutation.isPending}
            />
        </>
    );
}

export default SessionControlsPanel;
