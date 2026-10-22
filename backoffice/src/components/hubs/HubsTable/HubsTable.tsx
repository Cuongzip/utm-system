"use client";

import { useState } from "react";
import { Building2, Loader2, Edit, Trash2, MapPin } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    ActionMenu,
    ActionMenuItem,
    EmptyState,
    ConfirmDialog,
} from "@/components/ui";
import { cn } from "@/lib";
import type { Hub } from "@/types";
import styles from "./HubsTable.module.css";

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
        <div className={styles.container}>
            <ChamferCard size="lg" accent="dark" className="w-full">
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.th}>CODE</th>
                                <th className={styles.th}>NAME</th>
                                <th className={styles.th}>STATUS</th>
                                <th className={styles.th}>AVAILABLE DRONES</th>
                                <th className={styles.th}>AIRSPACE RADIUS</th>
                                <th className={styles.th} style={{ textAlign: "right" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyTd}>
                                        <div className={styles.emptyWrapper}>
                                            <Loader2 className="w-6 h-6 text-[var(--color-border-dark)] animate-spin" />
                                            <span>Loading vertiport hubs...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : hubs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-6">
                                        <EmptyState
                                            icon={Building2}
                                            title="No vertiport hubs found"
                                            description="Get started by adding a new hub"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                hubs.map((hub) => {
                                    const isSelected = selectedHubId === hub.id;
                                    const availableDrones = hub.availableDronesCount ?? "—";
                                    const radius = hub.airspaceRadius
                                        ? `${(hub.airspaceRadius / 1000).toFixed(1)} km`
                                        : "5.0 km";

                                    return (
                                        <tr
                                            key={hub.id}
                                            onClick={() => onSelectHub?.(hub)}
                                            className={cn(
                                                styles.row,
                                                isSelected && styles.selectedRow
                                            )}
                                        >
                                            <td className={styles.td}>
                                                <span className={styles.codeText}>{hub.code}</span>
                                            </td>
                                            <td className={styles.td}>
                                                <span className={styles.nameText}>{hub.name}</span>
                                            </td>
                                            <td className={styles.td}>
                                                <StatusBadge status={hub.status || "ACTIVE"} />
                                            </td>
                                            <td className={styles.td}>
                                                <span className={styles.valueText}>
                                                    {availableDrones}
                                                </span>
                                            </td>
                                            <td className={styles.td}>
                                                <span className={styles.valueText}>{radius}</span>
                                            </td>
                                            <td
                                                className={styles.td}
                                                style={{ textAlign: "right" }}
                                            >
                                                <ActionMenu items={getActions(hub)} />
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
                        Are you sure you want to delete vertiport hub{" "}
                        <strong className="text-slate-900">
                            {hubToDelete?.name || hubToDelete?.code || "this hub"}
                        </strong>
                        ? This may affect associated airspace sectors and flight routes.
                    </span>
                }
                confirmText="Delete Hub"
                variant="danger"
            />
        </div>
    );
}

export default HubsTable;
