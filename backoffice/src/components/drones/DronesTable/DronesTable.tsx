"use client";

import { Bot, Loader2, Edit, Trash2 } from "lucide-react";
import { ChamferCard, StatusBadge, ActionMenu, ActionMenuItem, EmptyState } from "@/components/ui";
import type { Drone } from "@/types";
import styles from "./DronesTable.module.css";

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
                onClick: () => {
                    if (confirm("Are you sure you want to delete this drone?")) {
                        onDeleteDrone(drone.id);
                    }
                },
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
                                <th className={styles.th}>REGISTRATION</th>
                                <th className={styles.th}>MANUFACTURER</th>
                                <th className={styles.th}>MODEL</th>
                                <th className={styles.th}>HOME HUB</th>
                                <th className={styles.th}>STATUS</th>
                                <th className={styles.th}>FLIGHT HOURS</th>
                                <th className={styles.th} style={{ textAlign: "right" }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className={styles.emptyTd}>
                                        <div className={styles.emptyWrapper}>
                                            <Loader2 className="w-6 h-6 text-[var(--color-border-dark)] animate-spin" />
                                            <span>Loading drone fleet...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : drones.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-6">
                                        <EmptyState
                                            icon={Bot}
                                            title="No drones found"
                                            description="Register a drone to monitor its status and telemetry"
                                        />
                                    </td>
                                </tr>
                            ) : (
                                drones.map((drone) => (
                                    <tr
                                        key={drone.id}
                                        className={styles.row}
                                        onClick={() => onSelectDrone?.(drone)}
                                    >
                                        <td className={styles.td}>
                                            <span className={styles.registrationText}>
                                                {drone.registrationNumber ||
                                                    drone.serialNumber ||
                                                    drone.id}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.manufacturerText}>
                                                {drone.manufacturer || "Unknown"}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.modelText}>{drone.model}</span>
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.homeHubText}>
                                                {drone.homeHub
                                                    ? drone.homeHub.name
                                                    : drone.homeHubName ||
                                                      drone.homeHubId ||
                                                      "Unassigned"}
                                            </span>
                                        </td>
                                        <td className={styles.td}>
                                            <StatusBadge status={drone.status || "AVAILABLE"} />
                                        </td>
                                        <td className={styles.td}>
                                            <span className={styles.flightHoursText}>
                                                {drone.flightHours !== undefined
                                                    ? drone.flightHours
                                                    : 0}
                                            </span>
                                        </td>
                                        <td
                                            className={styles.td}
                                            style={{ textAlign: "right" }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(drone)} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </ChamferCard>
        </div>
    );
}

export default DronesTable;
