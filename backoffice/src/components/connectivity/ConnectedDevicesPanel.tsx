"use client";

import { WifiOff, Activity, Trash2, Loader2 } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    EmptyState,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    Pagination,
} from "@/components/ui";
import { usePagination } from "@/hooks";
import { OFFLINE_DEVICE_STATUS, type DeviceRegistration } from "@/types";
import { formatDateTime, formatRelativeTime } from "@/utils";

export interface ConnectedDevicesPanelProps {
    status?: string;
    devices?: DeviceRegistration[];
    registeredCount?: number;
    loading?: boolean;
    onHeartbeat: (id: string) => void;
    onRevoke: (id: string) => void;
    onTroubleshootGateway: () => void;
    onProvisionEdgeAgent: () => void;
    onViewAllDevices: () => void;
}

export function ConnectedDevicesPanel({
    status = "STANDBY",
    devices = [],
    registeredCount = 0,
    loading = false,
    onHeartbeat,
    onRevoke,
    onTroubleshootGateway,
    onProvisionEdgeAgent,
    onViewAllDevices,
}: ConnectedDevicesPanelProps) {
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } = usePagination(
        devices,
        { defaultPageSize: 5 }
    );
    return (
        <ChamferCard size="lg" className="min-h-[365px]">
            <div className="p-5 flex flex-col flex-1 w-full">
                <div className="flex items-center justify-between pb-3 pl-2 border-b border-[var(--color-border-subtle)] w-full">
                    <h2 className="text-[12px] font-bold uppercase text-[var(--color-text-primary)] tracking-[0.6px] leading-4">
                        CONNECTED DEVICES
                    </h2>

                    <div className="flex items-center gap-1.5 pr-2">
                        <span
                            className={`w-2 h-2 rounded-full ${
                                devices.length > 0 ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                        />
                        <span className="font-mono text-[11px] text-[var(--color-text-muted)] leading-4">
                            {status}
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 flex-1 w-full">
                        <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
                        <p className="text-[13px] text-[var(--color-text-muted)]">
                            Loading connected devices...
                        </p>
                    </div>
                ) : devices.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                        <EmptyState
                            icon={WifiOff}
                            title="No Connected Devices"
                            description={
                                registeredCount > 0
                                    ? `All ${registeredCount} registered devices are currently offline / in standby. No live telemetry broadcast in the last 30s.`
                                    : "There are no ground or airborne devices broadcasting telemetry to the central gateway right now."
                            }
                        >
                            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                                {registeredCount > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={onViewAllDevices}
                                            className="text-xs font-bold text-cyan-600 hover:text-cyan-700 underline cursor-pointer"
                                        >
                                            View All Registered Devices ({registeredCount})
                                        </button>
                                        <span className="text-[16px] text-slate-300">•</span>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={onTroubleshootGateway}
                                    className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                >
                                    Troubleshoot Gateway
                                </button>
                                <span className="text-[16px] text-slate-300">•</span>
                                <button
                                    type="button"
                                    onClick={onProvisionEdgeAgent}
                                    className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
                                >
                                    Provision Edge Agent
                                </button>
                            </div>
                        </EmptyState>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto pt-2">
                        <Table fixed>
                            <TableHeader>
                                <TableRow>
                                    <TableHead width="180px">DEVICE IDENTIFIER</TableHead>
                                    <TableHead width="220px">DRONE / MODEL</TableHead>
                                    <TableHead width="130px">STATUS</TableHead>
                                    <TableHead width="180px">SOCKET ID</TableHead>
                                    <TableHead width="160px">LAST SEEN</TableHead>
                                    <TableHead width="90px" align="right">
                                        ACTIONS
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedItems.map((device) => {
                                    const currentStatus =
                                        device.connectionStatus ?? OFFLINE_DEVICE_STATUS;
                                    const droneTooltip =
                                        [
                                            device.droneRegistrationNumber,
                                            device.droneModel,
                                            device.droneId ? `ID: ${device.droneId}` : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" • ") || undefined;

                                    return (
                                        <TableRow key={device.id}>
                                            <TableCell
                                                mono
                                                bold
                                                darkText
                                                truncate
                                                tooltip={device.deviceIdentifier}
                                            >
                                                {device.deviceIdentifier || "—"}
                                            </TableCell>
                                            <TableCell truncate tooltip={droneTooltip}>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-medium text-[var(--color-text-primary)] truncate">
                                                        {device.droneRegistrationNumber ||
                                                            device.droneId?.substring(0, 8) ||
                                                            "—"}
                                                    </span>
                                                    {device.droneModel && (
                                                        <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                                                            {device.droneModel}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={currentStatus}
                                                    label={currentStatus.toUpperCase()}
                                                />
                                            </TableCell>
                                            <TableCell
                                                mono
                                                subtle
                                                truncate
                                                tooltip={device.socketId || undefined}
                                            >
                                                {device.socketId || "—"}
                                            </TableCell>
                                            <TableCell
                                                subtle
                                                truncate
                                                tooltip={
                                                    device.lastSeenAt
                                                        ? formatDateTime(
                                                              device.lastSeenAt,
                                                              "MMM dd, yyyy HH:mm:ss"
                                                          )
                                                        : undefined
                                                }
                                            >
                                                {device.lastSeenAt
                                                    ? formatRelativeTime(device.lastSeenAt)
                                                    : "Never"}
                                            </TableCell>
                                            <TableCell align="right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onHeartbeat(device.id)}
                                                        title="Ping Heartbeat"
                                                        className="btn-icon"
                                                    >
                                                        <Activity className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onRevoke(device.id)}
                                                        title="Revoke Device"
                                                        className="btn-icon-danger"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        {totalItems > 5 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}
