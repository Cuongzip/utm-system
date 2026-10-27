"use client";

import { useState } from "react";
import { Bot, Edit, Trash2 } from "lucide-react";
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
import type { Drone } from "@/types";

interface DronesTableProps {
    drones: Drone[];
    loading?: boolean;
    onEditDrone?: (drone: Drone) => void;
    onSelectDrone?: (drone: Drone) => void;
    onDeleteDrone?: (id: string) => void;
}

export function DronesTable({
    drones = [],
    loading = false,
    onEditDrone,
    onSelectDrone,
    onDeleteDrone,
}: DronesTableProps) {
    const [droneToDelete, setDroneToDelete] = useState<Drone | null>(null);

    const getActions = (drone: Drone): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [];

        if (onEditDrone || onSelectDrone) {
            items.push({
                label: "Edit",
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => {
                    if (onEditDrone) {
                        onEditDrone(drone);
                    } else if (onSelectDrone) {
                        onSelectDrone(drone);
                    }
                },
            });
        }

        if (onDeleteDrone) {
            items.push({
                label: "Delete",
                icon: <Trash2 className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setDroneToDelete(drone),
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
                            <TableHead width="180px">REGISTRATION</TableHead>
                            <TableHead width="150px">MANUFACTURER</TableHead>
                            <TableHead width="150px">MODEL</TableHead>
                            <TableHead width="180px">HOME HUB</TableHead>
                            <TableHead width="130px">STATUS</TableHead>
                            <TableHead width="130px">MAX PAYLOAD</TableHead>
                            <TableHead width="100px" align="right">
                                ACTIONS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={7} message="Loading drone fleet..." />
                        ) : drones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center">
                                    <EmptyState
                                        icon={Bot}
                                        title="No drones found"
                                        description="Register a drone to monitor its status and telemetry"
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            drones.map((drone) => {
                                const regText = drone.registrationNumber || drone.id;
                                const mfgText = drone.manufacturer || "Unknown";
                                const modelText = drone.model || "—";
                                const hubText = drone.homeHub
                                    ? drone.homeHub.name
                                    : drone.homeHubId || "Unassigned";
                                const maxPayloadText = drone.maxPayload
                                    ? `${drone.maxPayload} kg`
                                    : "—";

                                return (
                                    <TableRow key={drone.id} onClick={() => onSelectDrone?.(drone)}>
                                        <TableCell mono bold truncate tooltip={regText}>
                                            {regText}
                                        </TableCell>
                                        <TableCell darkText truncate tooltip={mfgText}>
                                            {mfgText}
                                        </TableCell>
                                        <TableCell muted truncate tooltip={modelText}>
                                            {modelText}
                                        </TableCell>
                                        <TableCell muted truncate tooltip={hubText}>
                                            {hubText}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={drone.status || "AVAILABLE"} />
                                        </TableCell>
                                        <TableCell mono darkText>
                                            {maxPayloadText}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(drone)} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!droneToDelete}
                onClose={() => setDroneToDelete(null)}
                onConfirm={() => {
                    if (droneToDelete && onDeleteDrone) {
                        onDeleteDrone(droneToDelete.id);
                        setDroneToDelete(null);
                    }
                }}
                title="Decommission Drone"
                description={
                    <span>
                        Are you sure you want to decommission drone{" "}
                        <strong className="text-slate-900">
                            {droneToDelete?.registrationNumber || droneToDelete?.id}
                        </strong>
                        ? This drone will be unassigned from any active flight routes.
                    </span>
                }
                confirmText="Decommission"
                variant="danger"
            />
        </div>
    );
}

export default DronesTable;
