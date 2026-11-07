"use client";

import { useState } from "react";
import { Building2, Edit, Trash2, MapPin } from "lucide-react";
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
import { formatDistance, formatAltitude, formatCoordinates } from "@/utils";
import { usePagination } from "@/hooks";
import type { Hub } from "@/types";

interface HubsTableProps {
    hubs: Hub[];
    loading?: boolean;
    selectedHubId?: string | null;
    onSelectHub: (hub: Hub) => void;
    onEditHub: (hub: Hub) => void;
    onDeleteHub: (id: string) => void;
}

export function HubsTable({
    hubs = [],
    loading = false,
    selectedHubId,
    onSelectHub,
    onEditHub,
    onDeleteHub,
}: HubsTableProps) {
    const [hubToDelete, setHubToDelete] = useState<Hub | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(hubs);

    const getActions = (hub: Hub): ActionMenuItem[] => [
        {
            label: "View on Map",
            icon: <MapPin className="w-3.5 h-3.5 text-slate-500" />,
            onClick: () => onSelectHub(hub),
        },
        {
            label: "Edit",
            icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
            onClick: () => onEditHub(hub),
        },
        {
            label: "Delete",
            icon: <Trash2 className="w-3.5 h-3.5" />,
            danger: true,
            onClick: () => setHubToDelete(hub),
        },
    ];

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="120px">CODE</TableHead>
                            <TableHead width="220px">NAME</TableHead>
                            <TableHead width="110px">STATUS</TableHead>
                            <TableHead width="160px">COORDINATES</TableHead>
                            <TableHead width="100px">ALTITUDE</TableHead>
                            <TableHead width="140px">AIRSPACE RADIUS</TableHead>
                            <TableHead width="80px" align="right">
                                ACTIONS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={7} message="Loading vertiport hubs..." />
                        ) : hubs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center">
                                    <EmptyState
                                        icon={Building2}
                                        title="No vertiport hubs found"
                                        description="Get started by adding a new hub"
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((hub) => {
                                const isSelected = selectedHubId === hub.id;
                                const radius = formatDistance(hub.airspaceRadius);
                                const altitude = formatAltitude(hub.altitudeMsl);
                                const coords = formatCoordinates(hub.location);

                                return (
                                    <TableRow
                                        key={hub.id}
                                        selected={isSelected}
                                        onClick={() => onSelectHub(hub)}
                                    >
                                        <TableCell mono bold>
                                            {hub.code || "—"}
                                        </TableCell>
                                        <TableCell truncate bold tooltip={hub.name}>
                                            {hub.name}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={hub.status || "ACTIVE"} />
                                        </TableCell>
                                        <TableCell mono darkText>
                                            {coords}
                                        </TableCell>
                                        <TableCell mono darkText>
                                            {altitude}
                                        </TableCell>
                                        <TableCell mono darkText>
                                            {radius}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(hub)} />
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
                isOpen={!!hubToDelete}
                onClose={() => setHubToDelete(null)}
                onConfirm={() => {
                    if (hubToDelete) {
                        onDeleteHub(hubToDelete.id);
                        setHubToDelete(null);
                    }
                }}
                title="Delete Vertiport Hub"
                description={
                    <span>
                        Are you sure you want to delete{" "}
                        <strong className="text-slate-900">{hubToDelete?.name}</strong>? All
                        associated drones will lose their home hub assignment.
                    </span>
                }
                confirmText="Delete Hub"
                variant="danger"
            />
        </div>
    );
}
