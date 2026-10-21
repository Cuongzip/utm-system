"use client";

import { useState, useMemo } from "react";
import { Activity, Trash2, Loader2, Plus } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge, SearchInput, EmptyState } from "@/components/ui";
import type { DeviceRegistration, DeviceConnectionStatus } from "@/types";
import styles from "./RegisteredDevicesTable.module.css";

interface RegisteredDevicesTableProps {
    devices: DeviceRegistration[];
    loading?: boolean;
    onRefresh?: () => void;
    onRegisterDevice?: () => void;
    onHeartbeat?: (id: string) => void;
    onRevoke?: (id: string) => void;
}

export function RegisteredDevicesTable({
    devices,
    loading = false,
    onRegisterDevice,
    onHeartbeat,
    onRevoke,
}: RegisteredDevicesTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | DeviceConnectionStatus>("all");

    const filteredDevices = useMemo(() => {
        return devices.filter((d) => {
            const matchSearch =
                search === "" ||
                Boolean(
                    d.deviceIdentifier &&
                    d.deviceIdentifier.toLowerCase().includes(search.toLowerCase())
                ) ||
                Boolean(d.droneId && d.droneId.toLowerCase().includes(search.toLowerCase())) ||
                Boolean(
                    d.droneRegistrationNumber &&
                    d.droneRegistrationNumber.toLowerCase().includes(search.toLowerCase())
                );

            const matchStatus = statusFilter === "all" || d.connectionStatus === statusFilter;

            return matchSearch && matchStatus;
        });
    }, [devices, search, statusFilter]);

    return (
        <ChamferCard size="lg" accent="dark" className="min-h-[420px]">
            <div className="p-5 flex flex-col h-full w-full gap-4">
                <div className={styles.toolbar}>
                    <div className={styles.filterGroup}>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            className={
                                statusFilter === "all" ? styles.filterBtnActive : styles.filterBtn
                            }
                        >
                            All ({devices.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("online")}
                            className={
                                statusFilter === "online"
                                    ? styles.filterBtnActive
                                    : styles.filterBtn
                            }
                        >
                            Online ({devices.filter((d) => d.connectionStatus === "online").length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("offline")}
                            className={
                                statusFilter === "offline"
                                    ? styles.filterBtnActive
                                    : styles.filterBtn
                            }
                        >
                            Offline (
                            {devices.filter((d) => d.connectionStatus === "offline").length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("connecting")}
                            className={
                                statusFilter === "connecting"
                                    ? styles.filterBtnActive
                                    : styles.filterBtn
                            }
                        >
                            Connecting (
                            {devices.filter((d) => d.connectionStatus === "connecting").length})
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="Search device ID or drone..."
                        />

                        <ChamferButton variant="dark" size="sm" onClick={onRegisterDevice}>
                            <Plus className="w-3.5 h-3.5 text-white" />
                            <span>Register</span>
                        </ChamferButton>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 w-full">
                        <Loader2 className="w-8 h-8 text-[var(--color-border-dark)] animate-spin mb-3" />
                        <p className="text-[13px] text-[#64748b]">Loading device registry...</p>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <EmptyState title="No devices found matching current filters" compact />
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.th}>Device Identifier</th>
                                    <th className={styles.th}>Drone ID / Model</th>
                                    <th className={styles.th}>Status</th>
                                    <th className={styles.th}>Socket ID</th>
                                    <th className={styles.th}>Certificate Fingerprint</th>
                                    <th className={styles.th}>Last Seen</th>
                                    <th className={`${styles.th} text-right`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDevices.map((device) => {
                                    return (
                                        <tr key={device.id} className={styles.row}>
                                            <td
                                                className={`${styles.td} font-mono font-bold text-[#0f172a]`}
                                            >
                                                {device.deviceIdentifier}
                                            </td>
                                            <td className={styles.td}>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-[#1e293b]">
                                                        {device.droneRegistrationNumber ||
                                                            device.droneId?.substring(0, 8) ||
                                                            "—"}
                                                    </span>
                                                    {device.droneModel && (
                                                        <span className="text-[11px] text-[#94a3b8]">
                                                            {device.droneModel}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={styles.td}>
                                                <StatusBadge
                                                    status={device.connectionStatus || "offline"}
                                                    label={(
                                                        device.connectionStatus || "offline"
                                                    ).toUpperCase()}
                                                />
                                            </td>
                                            <td
                                                className={`${styles.td} font-mono text-[11px] text-[#64748b]`}
                                            >
                                                {device.socketId || "—"}
                                            </td>
                                            <td
                                                className={`${styles.td} font-mono text-[11px] text-[#64748b]`}
                                            >
                                                {device.certificateFingerprint
                                                    ? `${device.certificateFingerprint.substring(0, 16)}...`
                                                    : "None"}
                                            </td>
                                            <td
                                                className={`${styles.td} text-[12px] text-[#64748b]`}
                                            >
                                                {device.lastSeenAt
                                                    ? new Date(device.lastSeenAt).toLocaleString()
                                                    : "Never"}
                                            </td>
                                            <td className={`${styles.td} text-right`}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onHeartbeat?.(device.id)}
                                                        title="Ping Heartbeat"
                                                        className="btn-icon"
                                                    >
                                                        <Activity className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onRevoke?.(device.id)}
                                                        title="Revoke Device"
                                                        className="btn-icon-danger"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}

export default RegisteredDevicesTable;
