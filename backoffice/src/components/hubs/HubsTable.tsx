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
} from "@/components/ui";
import { formatDistance } from "@/utils";
import type { Hub } from "@/types";

interface HubsTableProps {
    hubs: Hub[];
    loading?: boolean;
    selectedHubId?: string | null;
    onSelectHub?: (hub: Hub) => void;
    onEditHub?: (hub: Hub) => void;
    onDeleteHub?: (id: string) => void;
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

    const getActions = (hub: Hub): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: "View on Map",
                icon: <MapPin className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />,
                onClick: () => onSelectHub?.(hub),
            },
        ];

        if (onEditHub) {
            items.push({
                label: "Edit",
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onEditHub(hub),
            });
        }

        if (onDeleteHub) {
            items.push({
                label: "Delete",
                icon: <Trash2 className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setHubToDelete(hub),
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
                            <TableHead width="240px">NAME</TableHead>
                            <TableHead width="130px">STATUS</TableHead>
                            <TableHead width="170px">AVAILABLE DRONES</TableHead>
                            <TableHead width="150px">AIRSPACE RADIUS</TableHead>
                            <TableHead width="100px" align="right">
                                ACTIONS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={6} message="Loading vertiport hubs..." />
                        ) : hubs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center">
                                    <EmptyState
                                        icon={Building2}
                                        title="No vertiport hubs found"
                                        description="Get started by adding a new hub"
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            hubs.map((hub) => {
                                const isSelected = selectedHubId === hub.id;
                                const availableDrones = hub.availableDronesCount ?? "—";
                                const radius = hub.airspaceRadius
                                    ? formatDistance(hub.airspaceRadius)
                                    : "5.0 km";

                                return (
                                    <TableRow
                                        key={hub.id}
                                        selected={isSelected}
                                        onClick={() => onSelectHub?.(hub)}
                                    >
                                        <TableCell mono bold>
                                            {hub.code}
                                        </TableCell>
                                        <TableCell truncate bold tooltip={hub.name}>
                                            {hub.name}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={hub.status || "ACTIVE"} />
                                        </TableCell>
                                        <TableCell mono darkText>
                                            {availableDrones}
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
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!hubToDelete}
                onClose={() => setHubToDelete(null)}
                onConfirm={() => {
                    if (hubToDelete && onDeleteHub) {
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
