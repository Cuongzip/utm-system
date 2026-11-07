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
    Pagination,
} from "@/components/ui";
import { usePagination } from "@/hooks";
import type { Mission } from "@/types";
import { formatDate, formatNullable, formatHubName, formatMissionSchedule } from "@/utils";

export interface MissionsTableProps {
    missions: Mission[];
    loading?: boolean;
    selectedMissionId?: string | null;
    onSelectMission: (mission: Mission) => void;
    onExecuteMission: (mission: Mission) => void;
    onDuplicateMission: (mission: Mission) => void;
    onDeleteMission: (mission: Mission) => void;
    onNewMission: () => void;
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
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(missions);

    const getActions = (mission: Mission): ActionMenuItem[] => {
        const status = (mission.status || "draft").toLowerCase();
        const isDraft = status === "draft";

        const items: ActionMenuItem[] = [
            {
                label: isDraft ? "Edit Mission" : "View Details",
                icon: <Compass className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onSelectMission(mission),
            },
        ];

        if (status === "draft" || status === "scheduled") {
            items.push({
                label: "Execute Mission",
                icon: <Play className="w-3.5 h-3.5 text-emerald-600" />,
                onClick: () => onExecuteMission(mission),
            });
        }

        items.push({
            label: "Duplicate",
            icon: <Copy className="w-3.5 h-3.5 text-cyan-600" />,
            onClick: () => onDuplicateMission(mission),
        });

        if (status !== "executing") {
            items.push({
                label: "Delete",
                icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
                danger: true,
                onClick: () => setMissionToDelete(mission),
            });
        }

        return items;
    };

    return (
        <>
            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="160px">Code</TableHead>
                            <TableHead width="220px">Mission</TableHead>
                            <TableHead width="130px">Status</TableHead>
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
                                        action={{
                                            label: "Create First Mission",
                                            onClick: onNewMission,
                                        }}
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((mission) => {
                                const isSelected = mission.id === selectedMissionId;

                                const depName = formatHubName(
                                    mission.departureHub,
                                    mission.departureHubId,
                                    hubMap
                                );
                                const arrName = formatHubName(
                                    mission.arrivalHub,
                                    mission.arrivalHubId,
                                    hubMap
                                );
                                const waypointCount =
                                    mission.waypointCount ?? mission.waypoints?.length ?? 0;
                                const scheduleLabel = formatMissionSchedule(mission.scheduleType);

                                return (
                                    <TableRow
                                        key={mission.id}
                                        selected={isSelected}
                                        onClick={() => onSelectMission(mission)}
                                    >
                                        <TableCell mono bold darkText>
                                            <span className="font-mono text-xs font-semibold text-cyan-600 tracking-wider">
                                                {formatNullable(mission.code)}
                                            </span>
                                        </TableCell>

                                        <TableCell
                                            truncate
                                            bold
                                            tooltip={mission.name || mission.id}
                                        >
                                            <span className="font-semibold text-slate-900">
                                                {mission.name || "Untitled Mission"}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge
                                                status={mission.status || "draft"}
                                                shape="chamfer"
                                            />
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
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={setCurrentPage}
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!missionToDelete}
                title="Delete Mission"
                description={`Are you sure you want to delete mission "${missionToDelete?.name}"? All associated waypoints will be removed.`}
                confirmText="Delete Mission"
                variant="danger"
                onConfirm={() => {
                    if (missionToDelete) {
                        onDeleteMission(missionToDelete);
                    }
                    setMissionToDelete(null);
                }}
                onClose={() => setMissionToDelete(null)}
            />
        </>
    );
}
