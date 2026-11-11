"use client";

import { useState } from "react";
import { Radio, Power, PowerOff, Loader2 } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
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
import { ONLINE_DEVICE_STATUS, OFFLINE_DEVICE_STATUS, type DeviceRegistration } from "@/types";
import { formatRelativeTime, formatDateTime } from "@/utils";

interface DeviceHeartbeatTableProps {
    devices: DeviceRegistration[];
    loading?: boolean;
    onPowerOnDevice: (id: string) => Promise<void> | void;
    onPowerOffDevice: (id: string) => Promise<void> | void;
}

export function DeviceHeartbeatTable({
    devices = [],
    loading = false,
    onPowerOnDevice,
    onPowerOffDevice,
}: DeviceHeartbeatTableProps) {
    const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(devices);

    const handleAction = async (
        id: string,
        type: "on" | "off",
        fn: (id: string) => Promise<void> | void
    ) => {
        const actionKey = `${id}-${type}`;
        setPendingActions((prev) => ({ ...prev, [actionKey]: true }));
        try {
            await fn(id);
        } finally {
            setPendingActions((prev) => {
                const next = { ...prev };
                delete next[actionKey];
                return next;
            });
        }
    };

    const onlineCount = devices.filter((d) => d.connectionStatus === ONLINE_DEVICE_STATUS).length;

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-wider text-slate-800 uppercase font-mono">
                    DEVICE HEARTBEAT
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        <strong className="text-emerald-600">{onlineCount}</strong> /{" "}
                        {devices.length} Online
                    </span>
                </div>
            </div>

            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="200px">DEVICE IDENTIFIER</TableHead>
                            <TableHead width="180px">DRONE</TableHead>
                            <TableHead width="140px">CONNECTION STATUS</TableHead>
                            <TableHead width="180px">LAST HEARTBEAT</TableHead>
                            <TableHead width="180px" align="right">
                                ACTIONS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading
                                colSpan={5}
                                message="Loading registered hardware devices..."
                            />
                        ) : devices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="py-10 text-center">
                                    <EmptyState
                                        icon={Radio}
                                        title="No registered devices found"
                                        description="Register hardware devices in the Connectivity tab to simulate power and heartbeats"
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((device) => {
                                const deviceId = device.id;
                                const isOnline = device.connectionStatus === ONLINE_DEVICE_STATUS;
                                const isPendingOn = Boolean(pendingActions[`${deviceId}-on`]);
                                const isPendingOff = Boolean(pendingActions[`${deviceId}-off`]);

                                const droneText =
                                    device.droneRegistrationNumber || device.droneId || "—";
                                const lastSeenRelative = device.lastSeenAt
                                    ? formatRelativeTime(device.lastSeenAt)
                                    : "Never";
                                const lastSeenTooltip = device.lastSeenAt
                                    ? formatDateTime(device.lastSeenAt)
                                    : undefined;

                                return (
                                    <TableRow key={deviceId}>
                                        <TableCell
                                            mono
                                            bold
                                            truncate
                                            tooltip={device.deviceIdentifier || deviceId}
                                        >
                                            {device.deviceIdentifier || deviceId}
                                        </TableCell>
                                        <TableCell truncate tooltip={droneText}>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900">
                                                    {droneText}
                                                </span>
                                                {device.droneModel && (
                                                    <span className="text-[11px] text-slate-500">
                                                        {device.droneModel}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={
                                                    device.connectionStatus ?? OFFLINE_DEVICE_STATUS
                                                }
                                            />
                                        </TableCell>
                                        <TableCell
                                            muted
                                            truncate
                                            tooltip={lastSeenTooltip}
                                            className="text-xs"
                                        >
                                            {lastSeenRelative}
                                        </TableCell>
                                        <TableCell align="right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    disabled={
                                                        isOnline || isPendingOn || isPendingOff
                                                    }
                                                    onClick={() =>
                                                        handleAction(
                                                            deviceId,
                                                            "on",
                                                            onPowerOnDevice
                                                        )
                                                    }
                                                    className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-all border ${
                                                        isOnline
                                                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 active:scale-95 cursor-pointer shadow-2xs"
                                                    }`}
                                                    title={
                                                        isOnline
                                                            ? "Device is already powered ON"
                                                            : "Power ON device in simulation"
                                                    }
                                                >
                                                    {isPendingOn ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                                                    ) : (
                                                        <Power className="w-3.5 h-3.5 text-emerald-600" />
                                                    )}
                                                    <span>ON</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        !isOnline || isPendingOn || isPendingOff
                                                    }
                                                    onClick={() =>
                                                        handleAction(
                                                            deviceId,
                                                            "off",
                                                            onPowerOffDevice
                                                        )
                                                    }
                                                    className={`px-2.5 py-1 text-xs font-semibold rounded flex items-center gap-1.5 transition-all border ${
                                                        !isOnline
                                                            ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                            : "bg-slate-50 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300 border-slate-300 active:scale-95 cursor-pointer shadow-2xs"
                                                    }`}
                                                    title={
                                                        !isOnline
                                                            ? "Device is already powered OFF"
                                                            : "Power OFF device in simulation"
                                                    }
                                                >
                                                    {isPendingOff ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                                                    ) : (
                                                        <PowerOff className="w-3.5 h-3.5 text-slate-500" />
                                                    )}
                                                    <span>OFF</span>
                                                </button>
                                            </div>
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
        </div>
    );
}
