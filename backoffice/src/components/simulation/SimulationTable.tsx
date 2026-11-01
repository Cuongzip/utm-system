"use client";

import { useState } from "react";
import { PlayCircle, Pause, Play, Square, Trash2 } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    ActionMenu,
    type ActionMenuItem,
    ConfirmDialog,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
    EmptyState,
} from "@/components/ui";
import type { SimulationSession } from "@/types";

interface SimulationTableProps {
    sessions: SimulationSession[];
    loading?: boolean;
    onPauseSession?: (id: string) => void;
    onResumeSession?: (id: string) => void;
    onStopSession?: (id: string) => void;
    onDeleteSession?: (id: string) => void;
}

export function SimulationTable({
    sessions = [],
    loading = false,
    onPauseSession,
    onResumeSession,
    onStopSession,
    onDeleteSession,
}: SimulationTableProps) {
    const [sessionToDelete, setSessionToDelete] = useState<SimulationSession | null>(null);

    const getActions = (session: SimulationSession): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [];
        const normStatus = String(session.status || "").toLowerCase();

        if (normStatus === "running") {
            if (onPauseSession) {
                items.push({
                    label: "Pause",
                    icon: <Pause className="w-3.5 h-3.5 text-amber-500" />,
                    onClick: () => onPauseSession(session.id),
                });
            }
            if (onStopSession) {
                items.push({
                    label: "Stop",
                    icon: <Square className="w-3.5 h-3.5 text-slate-500" />,
                    onClick: () => onStopSession(session.id),
                });
            }
        } else if (normStatus === "paused") {
            if (onResumeSession) {
                items.push({
                    label: "Resume",
                    icon: <Play className="w-3.5 h-3.5 text-emerald-500" />,
                    onClick: () => onResumeSession(session.id),
                });
            }
            if (onStopSession) {
                items.push({
                    label: "Stop",
                    icon: <Square className="w-3.5 h-3.5 text-slate-500" />,
                    onClick: () => onStopSession(session.id),
                });
            }
        }

        if (onDeleteSession) {
            items.push({
                label: "Delete",
                icon: <Trash2 className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setSessionToDelete(session),
            });
        }

        return items;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="160px">SESSION ID</TableHead>
                            <TableHead width="160px">FLIGHT</TableHead>
                            <TableHead width="140px">DRONE</TableHead>
                            <TableHead width="130px">STATUS</TableHead>
                            <TableHead width="140px">SPEED & ACCEL</TableHead>
                            <TableHead width="100px">BATTERY</TableHead>
                            <TableHead width="170px">PROGRESS</TableHead>
                            <TableHead width="90px" align="right">
                                ACTIONS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={8} message="Loading simulation sessions..." />
                        ) : sessions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center">
                                    <EmptyState
                                        icon={PlayCircle}
                                        title="No simulation sessions"
                                        description="Launch a virtual simulation to test drone flight trajectory and telemetry generation"
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            sessions.map((session) => {
                                const sessionIdText = session.id || "—";
                                const flightText = session.flightId || "—";
                                const droneText = session.droneId || "Auto (from flight)";
                                const speedScaleText = `${(session.speed ?? 15).toFixed(1)} m/s (${(session.timeScale ?? 1).toFixed(1)}x)`;

                                const battery = session.currentBattery ?? 100;
                                const batteryColor =
                                    battery > 50
                                        ? "text-emerald-600 font-semibold"
                                        : battery > 20
                                          ? "text-amber-500 font-semibold"
                                          : "text-red-500 font-semibold";

                                const progress = Math.min(100, Math.max(0, session.progress ?? 0));
                                const distText =
                                    session.traveledDistance != null
                                        ? `${(session.traveledDistance / 1000).toFixed(1)} / ${(
                                              (session.totalDistance || 0) / 1000
                                          ).toFixed(1)} km`
                                        : "";

                                return (
                                    <TableRow key={session.id}>
                                        <TableCell mono bold truncate tooltip={sessionIdText}>
                                            {sessionIdText}
                                        </TableCell>
                                        <TableCell mono truncate tooltip={flightText}>
                                            {flightText}
                                        </TableCell>
                                        <TableCell darkText truncate tooltip={droneText}>
                                            {droneText}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={session.status || "RUNNING"} />
                                        </TableCell>
                                        <TableCell mono darkText>
                                            {speedScaleText}
                                        </TableCell>
                                        <TableCell mono>
                                            <span className={batteryColor}>
                                                {battery.toFixed(0)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 w-full max-w-[140px]">
                                                <div className="flex justify-between text-[11px] font-mono">
                                                    <span className="text-slate-700 font-medium">
                                                        {progress.toFixed(1)}%
                                                    </span>
                                                    <span className="text-slate-400 text-[10px]">
                                                        {distText}
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div
                                                        className="h-full bg-slate-600 rounded-full transition-all duration-300"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(session)} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!sessionToDelete}
                onClose={() => setSessionToDelete(null)}
                onConfirm={() => {
                    if (sessionToDelete && onDeleteSession) {
                        onDeleteSession(sessionToDelete.id);
                        setSessionToDelete(null);
                    }
                }}
                title="Delete Simulation Session"
                description={
                    <span>
                        Are you sure you want to stop and delete simulation session{" "}
                        <strong className="text-slate-900">{sessionToDelete?.id}</strong>? All
                        telemetry playback data for this session will be removed.
                    </span>
                }
                confirmText="Delete Session"
                variant="danger"
            />
        </div>
    );
}

export default SimulationTable;
