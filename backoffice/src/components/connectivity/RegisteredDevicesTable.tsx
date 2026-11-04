"use client";

import { useState, useMemo } from "react";
import { Activity, Trash2, Loader2, Plus } from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    SearchInput,
    EmptyState,
    ConfirmDialog,
    Tooltip,
} from "@/components/ui";
import type { DeviceRegistration, DeviceConnectionStatus } from "@/types";
import { formatDateTime, formatRelativeTime } from "@/utils";

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
    const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceRegistration | null>(null);

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
        <ChamferCard size="lg" className="min-h-[420px]">
            <div className="p-5 flex flex-col h-full w-full gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                                statusFilter === "all"
                                    ? "border-[var(--color-border-dark)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)]"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            All ({devices.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("online")}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                                statusFilter === "online"
                                    ? "border-[var(--color-border-dark)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)]"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            Online ({devices.filter((d) => d.connectionStatus === "online").length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("offline")}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                                statusFilter === "offline"
                                    ? "border-[var(--color-border-dark)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)]"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            Offline (
                            {devices.filter((d) => d.connectionStatus === "offline").length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter("connecting")}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                                statusFilter === "connecting"
                                    ? "border-[var(--color-border-dark)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)]"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
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
                    <div className="w-full overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-3 border-b border-slate-200">
                                        Device Identifier
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-3 border-b border-slate-200">
                                        Drone ID / Model
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-3 border-b border-slate-200">
                                        Status
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-3 border-b border-slate-200">
                                        Socket ID
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-3 border-b border-slate-200">
                                        Certificate Fingerprint
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-3 border-b border-slate-200">
                                        Last Seen
                                    </th>
                                    <th className="text-[11px] font-bold text-slate-500 uppercase tracking-wider p-3 border-b border-slate-200 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDevices.map((device) => {
                                    return (
                                        <tr
                                            key={device.id}
                                            className="hover:bg-slate-50/80 transition-colors"
                                        >
                                            <td className="p-3 text-[13px] font-mono font-bold text-[#0f172a] border-b border-slate-100">
                                                {device.deviceIdentifier}
                                            </td>
                                            <td className="p-3 text-[13px] text-slate-800 border-b border-slate-100">
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
                                            <td className="p-3 text-[13px] text-slate-800 border-b border-slate-100">
                                                <StatusBadge
                                                    status={device.connectionStatus || "offline"}
                                                    label={(
                                                        device.connectionStatus || "offline"
                                                    ).toUpperCase()}
                                                />
                                            </td>
                                            <td className="p-3 text-[13px] font-mono text-[11px] text-[#64748b] border-b border-slate-100">
                                                {device.socketId || "—"}
                                            </td>
                                            <td className="p-3 text-[13px] font-mono text-[11px] text-[#64748b] border-b border-slate-100">
                                                {device.certificateFingerprint
                                                    ? `${device.certificateFingerprint.substring(0, 16)}...`
                                                    : "None"}
                                            </td>
                                            <td className="p-3 text-[12px] text-[#64748b] border-b border-slate-100">
                                                {device.lastSeenAt
                                                    ? `${formatDateTime(device.lastSeenAt, "MMM dd, HH:mm")} (${formatRelativeTime(device.lastSeenAt)})`
                                                    : "Never"}
                                            </td>
                                            <td className="p-3 text-[13px] text-slate-800 border-b border-slate-100 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Tooltip content="Ping Heartbeat">
                                                        <button
                                                            type="button"
                                                            onClick={() => onHeartbeat?.(device.id)}
                                                            className="btn-icon"
                                                            aria-label="Ping Heartbeat"
                                                        >
                                                            <Activity className="w-3.5 h-3.5" />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content="Revoke Device">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeviceToRevoke(device)
                                                            }
                                                            className="btn-icon-danger"
                                                            aria-label="Revoke Device"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </Tooltip>
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

            <ConfirmDialog
                isOpen={!!deviceToRevoke}
                onClose={() => setDeviceToRevoke(null)}
                onConfirm={() => {
                    if (deviceToRevoke && onRevoke) {
                        onRevoke(deviceToRevoke.id);
                        setDeviceToRevoke(null);
                    }
                }}
                title="Revoke Device Registration"
                description={
                    <span>
                        Are you sure you want to revoke device{" "}
                        <strong className="text-slate-900 font-mono">
                            {deviceToRevoke?.deviceIdentifier || "this device"}
                        </strong>
                        ? The device socket connection will be terminated immediately.
                    </span>
                }
                confirmText="Revoke Device"
                variant="danger"
            />
        </ChamferCard>
    );
}

export default RegisteredDevicesTable;
