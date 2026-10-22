"use client";

import { useState } from "react";
import { Shield, Loader2, Edit, Trash2, MapPin } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    ActionMenu,
    type ActionMenuItem,
    EmptyState,
    ConfirmDialog,
} from "@/components/ui";
import { cn } from "@/lib";
import type { AirspaceZone } from "@/types";
import styles from "./AirspaceTable.module.css";

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
        <div className={styles.container}>
            <ChamferCard size="lg" accent="dark" className="w-full">
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>ZONE NAME</th>
                                <th className={styles.th}>TYPE</th>
                                <th className={styles.th}>ASSOCIATED HUB</th>
                                <th className={styles.th}>CEILING ALT</th>
                                <th className={styles.th}>STATUS</th>
                                <th className={styles.th} style={{ textAlign: "right" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyTd}>
                                        <div className={styles.emptyWrapper}>
                                            <Loader2 className="w-6 h-6 text-[var(--color-border-dark)] animate-spin" />
                                            <span>Loading airspace zones...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : zones.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8">
                                        <EmptyState
                                            icon={Shield}
                                            title="No airspace zones found"
                                            description="Establish your first 3D airspace restriction zone or corridor"
                                        />
                                    </td>
                                </tr>
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
                                        <tr
                                            key={zone.id}
                                            className={cn(
                                                styles.row,
                                                isSelected && styles.selectedRow
                                            )}
                                            onClick={() => onSelectZone?.(zone)}
                                        >
                                            <td className={styles.td}>
                                                <div className={styles.nameContainer}>
                                                    <span className={styles.nameText}>
                                                        {zone.name || "Unnamed Sector"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <StatusBadge
                                                    status={zone.zoneType || "warning"}
                                                    showDot={true}
                                                />
                                            </td>
                                            <td className={styles.td}>
                                                <span className="text-[13px] text-slate-700 font-medium">
                                                    {hubName}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <span className={styles.valueText}>
                                                    {altitudeText}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <StatusBadge
                                                    status={zone.status || "active"}
                                                    showDot={true}
                                                />
                                            </td>
                                            <td
                                                className={styles.td}
                                                style={{ textAlign: "right" }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ActionMenu items={getActions(zone)} />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
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
