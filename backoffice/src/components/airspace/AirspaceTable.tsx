"use client";

import { useState } from "react";
import { Shield, Edit, Trash2 } from "lucide-react";
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
import { formatNullable, formatHubName } from "@/utils";
import {
    type AirspaceZone,
    DEFAULT_AIRSPACE_ZONE_STATUS,
    DEFAULT_AIRSPACE_ZONE_TYPE,
} from "@/types";

interface AirspaceTableProps {
    zones: AirspaceZone[];
    loading: boolean;
    canDelete: boolean;
    selectedZoneId?: string | null;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    onSelectZone: (zone: AirspaceZone) => void;
    onDeleteZone: (id: string) => void;
    hubMap: Map<string, string>;
}

export function AirspaceTable({
    zones = [],
    loading = false,
    canDelete,
    selectedZoneId,
    hasFilters = false,
    onClearFilters,
    onSelectZone,
    onDeleteZone,
    hubMap = new Map(),
}: AirspaceTableProps) {
    const [zoneToDelete, setZoneToDelete] = useState<AirspaceZone | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(zones);

    const getActions = (zone: AirspaceZone): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: "View Details",
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onSelectZone(zone),
            },
        ];
        if (canDelete) {
            items.push({
                label: "Delete",
                icon: <Trash2 className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setZoneToDelete(zone),
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
                            <TableHead>CODE</TableHead>
                            <TableHead>ZONE NAME</TableHead>
                            <TableHead>TYPE</TableHead>
                            <TableHead>ASSOCIATED HUB</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead align="right">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={6} message="Loading airspace zones..." />
                        ) : zones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center">
                                    <EmptyState
                                        icon={Shield}
                                        title={
                                            hasFilters
                                                ? "No matching airspace zones"
                                                : "No airspace zones found"
                                        }
                                        description={
                                            hasFilters
                                                ? "No airspace sectors match the active search or status filter."
                                                : "Establish your first 3D airspace restriction zone or corridor."
                                        }
                                        action={
                                            hasFilters && onClearFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onClearFilters}
                                                >
                                                    Clear Filters
                                                </ChamferButton>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((zone) => {
                                const isSelected = selectedZoneId === zone.id;
                                const hubName = formatHubName(null, zone.hubId, hubMap);
                                const zoneName = zone.name || "Unnamed Sector";

                                return (
                                    <TableRow
                                        key={zone.id}
                                        selected={isSelected}
                                        onClick={() => onSelectZone(zone)}
                                    >
                                        <TableCell
                                            mono
                                            bold
                                            darkText
                                            truncate
                                            className="max-w-[130px]"
                                        >
                                            {formatNullable(zone.code)}
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            bold
                                            className="max-w-[220px]"
                                            tooltip={zoneName}
                                        >
                                            <span className="font-semibold text-slate-900">
                                                {zoneName}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={zone.zoneType ?? DEFAULT_AIRSPACE_ZONE_TYPE}
                                                showDot={true}
                                            />
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            muted
                                            className="max-w-[180px]"
                                            tooltip={hubName}
                                        >
                                            {hubName}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={zone.status ?? DEFAULT_AIRSPACE_ZONE_STATUS}
                                                showDot={true}
                                            />
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(zone)} />
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
                    itemLabel="zones"
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!zoneToDelete}
                onClose={() => setZoneToDelete(null)}
                onConfirm={() => {
                    if (zoneToDelete) {
                        onDeleteZone(zoneToDelete.id);
                        setZoneToDelete(null);
                    }
                }}
                title="Delete Airspace Zone"
                description={
                    <span>
                        Are you sure you want to delete airspace zone{" "}
                        <strong className="text-slate-900">
                            {zoneToDelete?.name || "this sector"}
                        </strong>
                        ? Any drones operating in this sector will lose geofence coverage.
                    </span>
                }
                confirmText="Delete Sector"
            />
        </div>
    );
}
