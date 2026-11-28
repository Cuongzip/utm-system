"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Edit, MapPin, Power, PowerOff, Wrench, FilterX, Plus } from "lucide-react";
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
    EmptyState,
    Pagination,
} from "@/components/ui";
import { formatDistance, formatAltitude, formatCoordinates } from "@/utils";
import { usePagination } from "@/hooks";
import {
    ACTIVE_HUB_STATUS,
    HUB_AIRSPACE_DEFAULTS,
    HUB_STATUS,
    type Hub,
    type HubOperationalMetrics,
    type HubStatus,
} from "@/types";
import { cn } from "@/lib";

export interface HubsTableProps {
    hubs: Hub[];
    totalHubsCount: number;
    loading: boolean;
    selectedHubId: string | null;
    hubMetricsMap: Record<string, HubOperationalMetrics>;
    canManageHubs: boolean;
    canEditHubs: boolean;
    hasActiveFilters: boolean;
    compact?: boolean;
    onClearFilters: () => void;
    onAddHub?: () => void;
    onSelectHub: (hub: Hub) => void;
    onFocusOnMap: (hub: Hub) => void;
    onEditHub: (hub: Hub) => void;
    onChangeStatus: (hub: Hub, status: HubStatus) => void;
    onDeactivateHub: (id: string) => void;
}

export function HubsTable({
    hubs = [],
    totalHubsCount,
    loading = false,
    selectedHubId,
    hubMetricsMap,
    canManageHubs,
    canEditHubs,
    hasActiveFilters,
    compact = false,
    onClearFilters,
    onAddHub,
    onSelectHub,
    onFocusOnMap,
    onEditHub,
    onChangeStatus,
    onDeactivateHub,
}: HubsTableProps) {
    const t = useTranslations("hubs.table");
    const tHubs = useTranslations("hubs");
    const [hubToDeactivate, setHubToDeactivate] = useState<Hub | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(hubs);

    const getActions = (hub: Hub): ActionMenuItem[] => {
        const status = hub.status ?? ACTIVE_HUB_STATUS;
        const items: ActionMenuItem[] = [
            {
                label: t("focusOnMap"),
                icon: <MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />,
                onClick: () => onFocusOnMap(hub),
            },
        ];

        if (canEditHubs) {
            items.push({
                label: t("editSpecs"),
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />,
                onClick: () => onEditHub(hub),
            });

            if (status === HUB_STATUS.ACTIVE) {
                items.push({
                    label: t("setMaintenance"),
                    icon: <Wrench className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />,
                    onClick: () => onChangeStatus(hub, HUB_STATUS.MAINTENANCE),
                });
            } else {
                items.push({
                    label: t("activateHub"),
                    icon: <Power className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />,
                    onClick: () => onChangeStatus(hub, HUB_STATUS.ACTIVE),
                });
            }
        }

        if (canManageHubs && status !== HUB_STATUS.INACTIVE) {
            items.push({
                label: t("deactivateHub"),
                icon: <PowerOff className="w-3.5 h-3.5" aria-hidden="true" />,
                danger: true,
                onClick: () => setHubToDeactivate(hub),
            });
        }

        return items;
    };

    const columnCount = compact ? 5 : 6;
    const compactCellClass = compact ? "px-2.5 first:pl-3.5 last:pr-3" : undefined;

    return (
        <div className="flex flex-col gap-3 w-full h-full min-h-0">
            <ChamferCard size="lg" className="w-full flex flex-col flex-1 min-h-0">
                <div className="flex-1 min-h-0 overflow-auto utm-scroll">
                    <Table fixed={false}>
                        <TableHeader className="sticky top-0 z-10">
                            <TableRow>
                                <TableHead
                                    className={cn(
                                        compact ? "min-w-[155px]" : "min-w-[200px]",
                                        compactCellClass
                                    )}
                                >
                                    {t("colHub")}
                                </TableHead>
                                <TableHead
                                    className={cn(
                                        compact ? "w-[88px]" : "w-[108px]",
                                        compactCellClass
                                    )}
                                >
                                    {t("colStatus")}
                                </TableHead>
                                {!compact && (
                                    <TableHead className="w-[170px]">
                                        {t("colLocationAlt")}
                                    </TableHead>
                                )}
                                <TableHead
                                    className={cn(
                                        compact ? "w-[102px]" : "w-[126px]",
                                        compactCellClass
                                    )}
                                >
                                    {t("colLoadCap")}
                                </TableHead>
                                <TableHead
                                    className={cn(
                                        compact ? "w-[84px]" : "w-[116px]",
                                        compactCellClass
                                    )}
                                >
                                    {t("colAirspace")}
                                </TableHead>
                                <TableHead
                                    className={cn(
                                        compact ? "w-[72px]" : "w-[76px]",
                                        compactCellClass
                                    )}
                                    align="right"
                                >
                                    {t("colActions")}
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody aria-busy={loading}>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <TableRow key={`hub-skeleton-${idx}`}>
                                        <TableCell colSpan={columnCount} className="py-3.5">
                                            <div className="flex items-center justify-between gap-4 animate-pulse">
                                                <div className="flex flex-col gap-1.5 flex-1">
                                                    <div className="h-3.5 w-28 rounded bg-slate-200" />
                                                    <div className="h-3 w-48 rounded bg-slate-100" />
                                                </div>
                                                <div className="h-4 w-16 rounded bg-slate-100" />
                                                <div className="h-4 w-20 rounded bg-slate-100" />
                                                <div className="h-7 w-7 rounded bg-slate-100" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : hubs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columnCount} className="py-12 text-center">
                                        {hasActiveFilters && totalHubsCount > 0 ? (
                                            <EmptyState
                                                icon={FilterX}
                                                title={t("emptyFilteredTitle")}
                                                description={t("emptyFilteredDesc")}
                                                action={{
                                                    label: t("clearFilters"),
                                                    onClick: onClearFilters,
                                                    variant: "outline",
                                                }}
                                            />
                                        ) : (
                                            <EmptyState
                                                icon={Building2}
                                                title={t("emptyTitle")}
                                                description={t("emptyDesc")}
                                                action={
                                                    canManageHubs && onAddHub
                                                        ? {
                                                              label: tHubs("addHub"),
                                                              onClick: onAddHub,
                                                              icon: Plus,
                                                              variant: "chamfer",
                                                          }
                                                        : undefined
                                                }
                                            />
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedItems.map((hub) => {
                                    const isSelected = selectedHubId === hub.id;
                                    const radius = formatDistance(hub.airspaceRadius);
                                    const altitude = formatAltitude(hub.altitudeMsl);
                                    const coords = formatCoordinates(hub.location);
                                    const floor =
                                        hub.airspaceFloor ?? HUB_AIRSPACE_DEFAULTS.airspaceFloor;
                                    const ceiling =
                                        hub.airspaceCeiling ??
                                        HUB_AIRSPACE_DEFAULTS.airspaceCeiling;
                                    const capacity =
                                        hub.maxSimultaneousDrones ??
                                        HUB_AIRSPACE_DEFAULTS.maxSimultaneousDrones;
                                    const metrics = hubMetricsMap[hub.id] ?? {
                                        activeFlights: 0,
                                        stationedDrones: 0,
                                    };
                                    const loadRatio =
                                        capacity > 0
                                            ? Math.min(
                                                  (metrics.activeFlights / capacity) * 100,
                                                  100
                                              )
                                            : 0;
                                    const barColor =
                                        loadRatio >= 90
                                            ? "bg-red-500"
                                            : loadRatio >= 70
                                              ? "bg-amber-500"
                                              : "bg-slate-700";

                                    return (
                                        <TableRow
                                            key={hub.id}
                                            selected={isSelected}
                                            onClick={() => onSelectHub(hub)}
                                        >
                                            <TableCell
                                                className={cn(
                                                    "whitespace-normal",
                                                    compactCellClass
                                                )}
                                            >
                                                <div className="flex flex-col gap-0.5 min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        {isSelected && (
                                                            <span
                                                                className="w-1.5 h-1.5 rounded-full bg-slate-800 shrink-0"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        <span className="font-mono text-[13px] font-semibold text-slate-900 tracking-tight">
                                                            {hub.code || "—"}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs text-slate-600 leading-snug">
                                                        {hub.name}
                                                    </span>
                                                    {compact && (
                                                        <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
                                                            {coords} · {altitude}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className={compactCellClass}>
                                                <StatusBadge
                                                    status={hub.status ?? ACTIVE_HUB_STATUS}
                                                />
                                            </TableCell>

                                            {!compact && (
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5 font-mono tabular-nums">
                                                        <span className="text-xs text-slate-800">
                                                            {coords}
                                                        </span>
                                                        <span className="text-[11px] text-slate-500">
                                                            {altitude} MSL
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            )}

                                            <TableCell className={compactCellClass}>
                                                <div
                                                    className={cn(
                                                        "flex flex-col gap-1",
                                                        compact ? "min-w-[82px]" : "min-w-[96px]"
                                                    )}
                                                >
                                                    <div className="flex items-baseline justify-between gap-1.5 font-mono tabular-nums">
                                                        <span className="text-xs font-semibold text-slate-900">
                                                            {metrics.activeFlights}/{capacity}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {metrics.stationedDrones === 1
                                                                ? t("droneSingular", {
                                                                      count: metrics.stationedDrones,
                                                                  })
                                                                : t("dronePlural", {
                                                                      count: metrics.stationedDrones,
                                                                  })}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-[width] duration-200",
                                                                barColor
                                                            )}
                                                            style={{ width: `${loadRatio}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className={compactCellClass}>
                                                <div className="flex flex-col gap-0.5 font-mono tabular-nums">
                                                    <span className="text-xs font-semibold text-slate-900">
                                                        {radius}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">
                                                        {floor}–{ceiling} m
                                                    </span>
                                                </div>
                                            </TableCell>

                                            <TableCell
                                                align="right"
                                                className={compactCellClass}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ActionMenu
                                                    items={getActions(hub)}
                                                    ariaLabel={t("actionsForAria", {
                                                        hub: hub.code || hub.name || hub.id,
                                                    })}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemLabel={tHubs("itemLabel")}
                    onPageChange={setCurrentPage}
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={Boolean(hubToDeactivate)}
                onClose={() => setHubToDeactivate(null)}
                onConfirm={() => {
                    if (hubToDeactivate) {
                        onDeactivateHub(hubToDeactivate.id);
                        setHubToDeactivate(null);
                    }
                }}
                title={t("deactivateTitle")}
                description={
                    <span>
                        {t("deactivateDescPrefix")}
                        <strong className="text-slate-900">
                            {hubToDeactivate?.name} ({hubToDeactivate?.code})
                        </strong>
                        {t("deactivateDescMiddle")}
                        <strong className="text-slate-900">{t("deactivateDescStatus")}</strong>
                        {t("deactivateDescSuffix")}
                    </span>
                }
                confirmText={t("deactivateHub")}
            />
        </div>
    );
}
