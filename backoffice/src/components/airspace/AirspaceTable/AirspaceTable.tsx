"use client";

import { useState } from "react";
import { Shield, Edit, Trash2, MapPin } from "lucide-react";
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
    TableEmpty,
} from "@/components/ui";
import type { AirspaceZone } from "@/types";

interface AirspaceTableProps {
    zones: AirspaceZone[];
    loading?: boolean;
    selectedZoneId?: string | null;
    onSelectZone?: (zone: AirspaceZone) => void;
    onEditZone?: (zone: AirspaceZone) => void;
    onDeleteZone?: (id: string) => void;
    hubMap?: Map<string, string>;
}

export function AirspaceTable({
    zones = [],
    loading = false,
    selectedZoneId,
    onSelectZone,
    onEditZone,
    onDeleteZone,
    hubMap = new Map(),
}: AirspaceTableProps) {
    const [zoneToDelete, setZoneToDelete] = useState<AirspaceZone | null>(null);

    const getActions = (zone: AirspaceZone): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: "View on Map",
                icon: <MapPin className="w-3.5 h-3.5 text-[var(--color-border-dark)]" />,
                onClick: () => onSelectZone?.(zone),
            },
        ];

        if (onEditZone) {
            items.push({
                label: "Edit",
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onEditZone(zone),
            });
        }

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
            <ChamferCard size="lg" accent="dark" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="30%">ZONE NAME</TableHead>
                            <TableHead width="16%">TYPE</TableHead>
                            <TableHead width="22%">ASSOCIATED HUB</TableHead>
                            <TableHead width="14%">CEILING ALT</TableHead>
                            <TableHead width="12%">STATUS</TableHead>
                            <TableHead width="6%" align="right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={6} message="Loading airspace zones..." />
                        ) : zones.length === 0 ? (
                            <TableEmpty
                                colSpan={6}
                                icon={Shield}
                                title="No airspace zones found"
                                description="Establish your first 3D airspace restriction zone or corridor"
                            />
                        ) : (
                            zones.map((zone) => {
                                const isSelected = selectedZoneId === zone.id;
                                const hubName = zone.hubId
                                    ? hubMap.get(zone.hubId) || zone.hubId
                                    : "—";
                                const altitudeText =
                                    zone.altitudeCeiling !== undefined
                                        ? `${zone.altitudeCeiling} m`
                                        : "120 m";

                                return (
                                    <TableRow
                                        key={zone.id}
                                        selected={isSelected}
                                        onClick={() => onSelectZone?.(zone)}
                                    >
                                        <TableCell
                                            truncate
                                            bold
                                            tooltip={zone.name || "Unnamed Sector"}
                                        >
                                            {zone.name || "Unnamed Sector"}
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
                                        <TableCell mono darkText>
                                            {altitudeText}
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
