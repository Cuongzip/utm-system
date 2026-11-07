"use client";

import { useState } from "react";
import { Shield, Edit, Trash2 } from "lucide-react";
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
import type { AirspaceZone } from "@/types";

interface AirspaceTableProps {
    zones: AirspaceZone[];
    loading?: boolean;
    selectedZoneId?: string | null;
    onSelectZone?: (zone: AirspaceZone) => void;
    onDeleteZone?: (id: string) => void;
    hubMap?: Map<string, string>;
}

export function AirspaceTable({
    zones = [],
    loading = false,
    selectedZoneId,
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
                onClick: () => onSelectZone?.(zone),
            },
        ];

        if (onDeleteZone) {
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
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="140px">CODE</TableHead>
                            <TableHead width="230px">ZONE NAME</TableHead>
                            <TableHead width="140px">TYPE</TableHead>
                            <TableHead width="180px">ASSOCIATED HUB</TableHead>
                            <TableHead width="130px">STATUS</TableHead>
                            <TableHead width="90px" align="right">
                                ACTIONS
                            </TableHead>
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
                                        title="No airspace zones found"
                                        description="Establish your first 3D airspace restriction zone or corridor"
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((zone) => {
                                const isSelected = selectedZoneId === zone.id;
                                const hubName = zone.hubId
                                    ? hubMap.get(zone.hubId) || zone.hubId
                                    : "—";

                                return (
                                    <TableRow
                                        key={zone.id}
                                        selected={isSelected}
                                        onClick={() => onSelectZone?.(zone)}
                                    >
                                        <TableCell mono bold darkText>
                                            {zone.code || "—"}
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            bold
                                            tooltip={zone.name || "Unnamed Sector"}
                                        >
                                            <span className="font-semibold text-slate-900">
                                                {zone.name || "Unnamed Sector"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={zone.zoneType || "warning"}
                                                showDot={true}
                                            />
                                        </TableCell>
                                        <TableCell truncate muted tooltip={hubName}>
                                            {hubName}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={zone.status || "active"}
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
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!zoneToDelete}
                onClose={() => setZoneToDelete(null)}
                onConfirm={() => {
                    if (zoneToDelete && onDeleteZone) {
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
                variant="danger"
            />
        </div>
    );
}
