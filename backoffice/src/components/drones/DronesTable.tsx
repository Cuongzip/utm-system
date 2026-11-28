"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Drone as DroneIcon, Edit, PowerOff } from "lucide-react";
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
import { useHubsAll, usePagination } from "@/hooks";
import { formatNullable, formatHubName } from "@/utils";
import { type Drone, DEFAULT_DRONE_STATUS } from "@/types";

export interface DronesTableProps {
    drones: Drone[];
    loading: boolean;
    canEdit: boolean;
    canDelete: boolean;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    onEditDrone: (drone: Drone) => void;
    onDeleteDrone: (id: string) => void;
}

export function DronesTable({
    drones = [],
    loading = false,
    canEdit,
    canDelete,
    hasFilters = false,
    onClearFilters,
    onEditDrone,
    onDeleteDrone,
}: DronesTableProps) {
    const t = useTranslations("drones.table");
    const tDrones = useTranslations("drones");
    const tCommon = useTranslations("common");
    const [droneToDelete, setDroneToDelete] = useState<Drone | null>(null);
    const { data: hubs = [] } = useHubsAll();
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(drones);

    const hubMap = useMemo(
        () => new Map(hubs.filter((h) => h.id).map((h) => [h.id, h.code || h.name || h.id])),
        [hubs]
    );

    const hasActions = canEdit || canDelete;
    const colSpan = hasActions ? 7 : 6;

    const getActions = (drone: Drone): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [];
        if (canEdit) {
            items.push({
                label: tCommon("edit"),
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onEditDrone(drone),
            });
        }
        if (canDelete) {
            items.push({
                label: t("decommission"),
                icon: <PowerOff className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setDroneToDelete(drone),
            });
        }
        return items;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("colRegistration")}</TableHead>
                            <TableHead>{t("colManufacturer")}</TableHead>
                            <TableHead>{t("colModel")}</TableHead>
                            <TableHead>{t("colHomeHub")}</TableHead>
                            <TableHead>{t("colStatus")}</TableHead>
                            <TableHead>{t("colSpecs")}</TableHead>
                            {hasActions && <TableHead align="right">{t("colActions")}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={colSpan} message={t("loading")} />
                        ) : drones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={colSpan} className="py-10 text-center">
                                    <EmptyState
                                        icon={DroneIcon}
                                        title={
                                            hasFilters ? t("emptyFilteredTitle") : t("emptyTitle")
                                        }
                                        description={
                                            hasFilters ? t("emptyFilteredDesc") : t("emptyDesc")
                                        }
                                        action={
                                            hasFilters && onClearFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onClearFilters}
                                                >
                                                    {t("clearFilters")}
                                                </ChamferButton>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((drone) => {
                                const regText = drone.registrationNumber || drone.id;
                                const mfgText = drone.manufacturer || t("unknownManufacturer");
                                const modelText = drone.model || "—";
                                const hubText = formatHubName(
                                    drone.homeHub,
                                    drone.homeHubId,
                                    hubMap,
                                    t("unassignedHub")
                                );
                                const isAwayFromHome = Boolean(
                                    drone.currentHubId && drone.currentHubId !== drone.homeHubId
                                );
                                const currentHubLabel = isAwayFromHome
                                    ? hubMap.get(drone.currentHubId!) ||
                                      drone.currentHubId!.slice(0, 8)
                                    : null;
                                const hubTooltip = currentHubLabel
                                    ? t("currentHubTooltip", {
                                          home: hubText,
                                          current: currentHubLabel,
                                      })
                                    : hubText;

                                const payloadPart = formatNullable(
                                    drone.maxPayload,
                                    (val) => `${val} kg`
                                );
                                const batteryWhPart =
                                    drone.batteryCapacityWh != null
                                        ? `${Math.round(drone.batteryCapacityWh)} Wh`
                                        : null;
                                const primarySpecs = batteryWhPart
                                    ? `${payloadPart} · ${batteryWhPart}`
                                    : payloadPart;

                                const specsTooltipParts: string[] = [primarySpecs];
                                if (drone.currentBatteryPct != null) {
                                    specsTooltipParts.push(
                                        t("chargeTooltip", {
                                            pct: Math.round(drone.currentBatteryPct),
                                        })
                                    );
                                }
                                if (drone.totalFlightHours != null) {
                                    specsTooltipParts.push(
                                        t("hoursTooltip", {
                                            hours: drone.totalFlightHours.toFixed(1),
                                        })
                                    );
                                }
                                const specsTooltip = specsTooltipParts.join(" · ");

                                return (
                                    <TableRow
                                        key={drone.id}
                                        onClick={canEdit ? () => onEditDrone(drone) : undefined}
                                    >
                                        <TableCell
                                            mono
                                            bold
                                            truncate
                                            className="max-w-[140px]"
                                            tooltip={regText}
                                        >
                                            {regText}
                                        </TableCell>
                                        <TableCell
                                            darkText
                                            truncate
                                            className="max-w-[110px]"
                                            tooltip={mfgText}
                                        >
                                            {mfgText}
                                        </TableCell>
                                        <TableCell
                                            muted
                                            truncate
                                            className="max-w-[215px]"
                                            tooltip={modelText}
                                        >
                                            {modelText}
                                        </TableCell>
                                        <TableCell
                                            muted
                                            truncate
                                            className="max-w-[160px]"
                                            tooltip={hubTooltip}
                                        >
                                            {hubText}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={drone.status ?? DEFAULT_DRONE_STATUS}
                                            />
                                        </TableCell>
                                        <TableCell mono darkText truncate tooltip={specsTooltip}>
                                            {primarySpecs}
                                        </TableCell>
                                        {hasActions && (
                                            <TableCell
                                                align="right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ActionMenu items={getActions(drone)} />
                                            </TableCell>
                                        )}
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
                    itemLabel={tDrones("itemLabel")}
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!droneToDelete}
                onClose={() => setDroneToDelete(null)}
                onConfirm={() => {
                    if (droneToDelete) {
                        onDeleteDrone(droneToDelete.id);
                        setDroneToDelete(null);
                    }
                }}
                title={t("decommissionTitle")}
                description={
                    <span>
                        {t("decommissionDescPrefix")}
                        <strong className="text-slate-900">
                            {droneToDelete?.registrationNumber || droneToDelete?.id}
                        </strong>
                        {t("decommissionDescSuffix")}
                    </span>
                }
                confirmText={t("decommission")}
            />
        </div>
    );
}
