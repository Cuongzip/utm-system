"use client";

import { useState } from "react";
import { Compass, MapPin, Play, Copy, Trash2 } from "lucide-react";
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
import type { Mission } from "@/types";
import { formatDate } from "@/utils";

export interface MissionsTableProps {
    missions: Mission[];
    loading?: boolean;
    selectedMissionId?: string | null;
    onSelectMission?: (mission: Mission) => void;
    onExecuteMission?: (mission: Mission) => void;
    onDuplicateMission?: (mission: Mission) => void;
    onDeleteMission?: (mission: Mission) => void;
    onNewMission?: () => void;
    hubMap?: Map<string, string>;
}

export function MissionsTable({
    missions = [],
    loading = false,
    selectedMissionId,
    onSelectMission,
    onExecuteMission,
    onDuplicateMission,
    onDeleteMission,
    onNewMission,
    hubMap = new Map(),
}: MissionsTableProps) {
    const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);

    const getActions = (mission: Mission): ActionMenuItem[] => {
        const status = (mission.status || "draft").toLowerCase();
        const isDraft = status === "draft";

        const items: ActionMenuItem[] = [
            {
                label: isDraft ? "Edit Mission" : "View Details",
                icon: <Compass className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />,
                onClick: () => onSelectMission?.(mission),
            },
        ];

        if (status === "draft" || status === "scheduled") {
            if (onExecuteMission) {
                items.push({
                    label: "Execute Mission",
                    icon: <Play className="w-3.5 h-3.5 text-emerald-600" />,
                    onClick: () => onExecuteMission(mission),
                });
            }
        }

        if (onDuplicateMission) {
            items.push({
                label: "Duplicate",
                icon: <Copy className="w-3.5 h-3.5 text-cyan-600" />,
                onClick: () => onDuplicateMission(mission),
            });
        }

        if (status !== "executing") {
            if (onDeleteMission) {
                items.push({
                    label: "Delete",
                    icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
                    danger: true,
                    onClick: () => setMissionToDelete(mission),
                });
            }
        }

        return items;
    };

    return (
        <>
            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="220px">Mission</TableHead>
                            <TableHead width="130px">Status</TableHead>
                            <TableHead width="170px">Operator</TableHead>
                            <TableHead width="220px">Route</TableHead>
                            <TableHead width="110px">Schedule</TableHead>
                            <TableHead width="100px">Waypoints</TableHead>
                            <TableHead width="120px">Created</TableHead>
                            <TableHead width="100px" align="right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={8} />
                        ) : missions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center">
                                    <EmptyState
                                        icon={Compass}
                                        title="No missions found"
                                        description="Plan and automate flight routes across your vertiport network"
                                        action={
                                            onNewMission
                                                ? {
                                                      label: "Create First Mission",
                                                      onClick: onNewMission,
                                                  }
                                                : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            missions.map((mission) => {
                                const isSelected = mission.id === selectedMissionId;

                                const depName =
                                    mission.departureHub?.name ||
                                    (mission.departureHubId
                                        ? hubMap.get(mission.departureHubId) ||
                                          mission.departureHubId
                                        : "—");
                                const arrName =
                                    mission.arrivalHub?.name ||
                                    (mission.arrivalHubId
                                        ? hubMap.get(mission.arrivalHubId) || mission.arrivalHubId
                                        : "—");

                                const operatorName = mission.createdBy || "System";

                                const waypointCount =
                                    mission.waypointCount ?? mission.waypoints?.length ?? 0;

                                const scheduleLabel =
                                    mission.scheduleType === "scheduled"
                                        ? "Scheduled"
                                        : "Immediate";

                                return (
                                    <TableRow
                                        key={mission.id}
                                        selected={isSelected}
                                        onClick={() => onSelectMission?.(mission)}
                                    >
                                        <TableCell
                                            truncate
                                            bold
                                            tooltip={mission.name || mission.id}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">
                                                    {mission.name || "Untitled Mission"}
                                                </span>
                                                {mission.description && (
                                                    <span className="text-xs text-slate-500 truncate max-w-[200px]">
                                                        {mission.description}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge
                                                status={mission.status || "draft"}
                                                shape="chamfer"
                                            />
                                        </TableCell>

                                        <TableCell truncate tooltip={operatorName}>
                                            <span className="font-mono text-xs text-slate-800">
                                                {operatorName}
                                            </span>
                                        </TableCell>

                                        <TableCell truncate tooltip={`${depName} → ${arrName}`}>
                                            <div className="flex flex-col text-xs">
                                                <span className="font-medium text-slate-800 truncate">
                                                    {depName}
                                                </span>
                                                <span className="text-slate-400 font-mono text-[11px] truncate">
                                                    → {arrName}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-xs text-slate-600 font-medium">
                                                {scheduleLabel}
                                            </span>
                                        </TableCell>

                                        <TableCell mono darkText>
                                            <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                <MapPin className="w-3 h-3 text-slate-500" />
                                                <span>{waypointCount}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell mono darkText>
                                            <span className="text-xs text-slate-500">
                                                {formatDate(mission.createdOn)}
                                            </span>
                                        </TableCell>

                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(mission)} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!missionToDelete}
                title="Delete Mission"
                description={`Are you sure you want to delete mission "${missionToDelete?.name}"? All associated waypoints will be removed.`}
                confirmText="Delete Mission"
                variant="danger"
                onConfirm={() => {
                    if (missionToDelete && onDeleteMission) {
                        onDeleteMission(missionToDelete);
                    }
                    setMissionToDelete(null);
                }}
                onClose={() => setMissionToDelete(null)}
            />
        </>
    );
}

export default MissionsTable;
