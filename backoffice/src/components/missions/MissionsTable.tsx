"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Compass, Play, Copy, Trash2, CalendarClock, CalendarOff } from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
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
import {
    type Mission,
    MISSION_STATUS,
    EXECUTABLE_MISSION_STATUSES,
    MISSION_SCHEDULE_TYPE,
    DEFAULT_MISSION_STATUS,
} from "@/types";
import { formatDate, formatNullable, formatHubName, formatMissionSchedule } from "@/utils";

export interface MissionsTableProps {
    missions: Mission[];
    loading: boolean;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    onSelectMission: (mission: Mission) => void;
    onExecuteMission: (mission: Mission) => void;
    onScheduleMission: (mission: Mission) => void;
    onUnscheduleMission: (mission: Mission) => void;
    onDuplicateMission: (mission: Mission) => void;
    onDeleteMission: (mission: Mission) => void;
    onNewMission: () => void;
    hubMap: Map<string, string>;
}

export function MissionsTable({
    missions = [],
    loading = false,
    hasFilters = false,
    onClearFilters,
    onSelectMission,
    onExecuteMission,
    onScheduleMission,
    onUnscheduleMission,
    onDuplicateMission,
    onDeleteMission,
    onNewMission,
    hubMap = new Map(),
}: MissionsTableProps) {
    const t = useTranslations("missions");
    const tCommon = useTranslations("common");
    const [missionToDelete, setMissionToDelete] = useState<Mission | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(missions);

    const getActions = (mission: Mission): ActionMenuItem[] => {
        const status = (mission.status || DEFAULT_MISSION_STATUS).toLowerCase();
        const isDraft = status === MISSION_STATUS.DRAFT;
        const isScheduled = status === MISSION_STATUS.SCHEDULED;
        const canSchedule =
            isDraft &&
            mission.scheduleType === MISSION_SCHEDULE_TYPE.SCHEDULED &&
            Boolean(mission.scheduledAt);

        const items: ActionMenuItem[] = [
            {
                label: isDraft ? t("actions.edit") : t("actions.viewDetails"),
                icon: <Compass className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onSelectMission(mission),
            },
        ];

        if (EXECUTABLE_MISSION_STATUSES.has(status)) {
            items.push({
                label:
                    status === MISSION_STATUS.COMPLETED ||
                    status === MISSION_STATUS.ABORTED ||
                    status === MISSION_STATUS.FAILED
                        ? t("actions.reExecute")
                        : t("actions.execute"),
                icon: <Play className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onExecuteMission(mission),
            });
        }

        if (canSchedule) {
            items.push({
                label: t("actions.scheduleDispatch"),
                icon: <CalendarClock className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onScheduleMission(mission),
            });
        }

        if (isScheduled) {
            items.push({
                label: t("actions.unscheduleDraft"),
                icon: <CalendarOff className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onUnscheduleMission(mission),
            });
        }

        items.push({
            label: t("actions.duplicate"),
            icon: <Copy className="w-3.5 h-3.5 text-slate-500" />,
            onClick: () => onDuplicateMission(mission),
        });

        if (status !== MISSION_STATUS.EXECUTING && status !== MISSION_STATUS.PAUSED) {
            items.push({
                label: tCommon("delete"),
                icon: <Trash2 className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setMissionToDelete(mission),
            });
        }

        return items;
    };

    return (
        <>
            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("table.code")}</TableHead>
                            <TableHead>{t("table.mission")}</TableHead>
                            <TableHead>{t("table.status")}</TableHead>
                            <TableHead>{t("table.route")}</TableHead>
                            <TableHead>{t("table.schedule")}</TableHead>
                            <TableHead>{t("table.wps")}</TableHead>
                            <TableHead>{t("table.created")}</TableHead>
                            <TableHead align="right">{t("table.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={8} message={t("table.loading")} />
                        ) : missions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="py-10 text-center">
                                    <EmptyState
                                        icon={Compass}
                                        title={
                                            hasFilters ? t("empty.filteredTitle") : t("empty.title")
                                        }
                                        description={
                                            hasFilters ? t("empty.filteredDesc") : t("empty.desc")
                                        }
                                        action={
                                            hasFilters && onClearFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onClearFilters}
                                                >
                                                    {t("empty.clearFilters")}
                                                </ChamferButton>
                                            ) : (
                                                {
                                                    label: t("empty.createFirst"),
                                                    onClick: onNewMission,
                                                }
                                            )
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((mission) => {
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
                                        onClick={() => onSelectMission(mission)}
                                    >
                                        <TableCell
                                            mono
                                            bold
                                            darkText
                                            className="min-w-[160px] whitespace-nowrap"
                                        >
                                            {formatNullable(mission.code)}
                                        </TableCell>

                                        <TableCell
                                            truncate
                                            bold
                                            className="max-w-[210px]"
                                            tooltip={mission.name || mission.id}
                                        >
                                            <span className="font-semibold text-slate-900">
                                                {mission.name || t("untitledMission")}
                                            </span>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge
                                                status={mission.status ?? DEFAULT_MISSION_STATUS}
                                            />
                                        </TableCell>

                                        <TableCell
                                            truncate
                                            className="max-w-[195px]"
                                            tooltip={`${depName} → ${arrName}`}
                                        >
                                            <div className="flex flex-col text-xs min-w-0">
                                                <span className="font-medium text-slate-800 truncate">
                                                    {depName}
                                                </span>
                                                <span className="text-slate-400 font-mono text-[11px] truncate">
                                                    → {arrName}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="whitespace-nowrap">
                                            <span className="text-xs text-slate-600 font-medium">
                                                {scheduleLabel}
                                            </span>
                                        </TableCell>

                                        <TableCell mono darkText>
                                            {waypointCount}
                                        </TableCell>

                                        <TableCell mono darkText className="whitespace-nowrap">
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
                    itemLabel={t("itemLabel")}
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!missionToDelete}
                title={t("deleteDialog.title")}
                description={t("deleteDialog.desc", { name: missionToDelete?.name || "" })}
                confirmText={t("deleteDialog.confirm")}
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
