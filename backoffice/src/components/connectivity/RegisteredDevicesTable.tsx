"use client";

import { useState, useMemo } from "react";
import { Activity, Trash2, Radio } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    TableFilterBar,
    type CustomSelectOption,
    EmptyState,
    ConfirmDialog,
    ActionMenu,
    type ActionMenuItem,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
    Pagination,
} from "@/components/ui";
import { usePagination } from "@/hooks";
import {
    OFFLINE_DEVICE_STATUS,
    DEVICE_CONNECTION_STATUSES,
    type DeviceRegistration,
    type DeviceConnectionStatus,
} from "@/types";
import { formatDateTime, formatRelativeTime } from "@/utils";

const DEVICE_STATUS_OPTIONS: CustomSelectOption[] = [
    { value: "all", label: "All Statuses" },
    ...DEVICE_CONNECTION_STATUSES.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
    })),
];

export interface RegisteredDevicesTableProps {
    devices: DeviceRegistration[];
    loading?: boolean;
    onHeartbeat: (id: string) => void;
    onRevoke: (id: string) => void;
}

export function RegisteredDevicesTable({
    devices = [],
    loading = false,
    onHeartbeat,
    onRevoke,
}: RegisteredDevicesTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | DeviceConnectionStatus>("all");
    const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceRegistration | null>(null);

    const filteredDevices = useMemo(() => {
        const q = search.trim().toLowerCase();
        return devices.filter((d) => {
            const matchSearch =
                !q ||
                d.deviceIdentifier?.toLowerCase().includes(q) ||
                d.droneId?.toLowerCase().includes(q) ||
                d.droneRegistrationNumber?.toLowerCase().includes(q) ||
                d.droneModel?.toLowerCase().includes(q) ||
                d.socketId?.toLowerCase().includes(q);

            const matchStatus = statusFilter === "all" || d.connectionStatus === statusFilter;

            return Boolean(matchSearch && matchStatus);
        });
    }, [devices, search, statusFilter]);

    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(filteredDevices);

    const getActions = (device: DeviceRegistration): ActionMenuItem[] => [
        {
            label: "Ping Heartbeat",
            icon: <Activity className="w-3.5 h-3.5 text-emerald-600" />,
            onClick: () => onHeartbeat(device.id),
        },
        {
            label: "Revoke Device",
            icon: <Trash2 className="w-3.5 h-3.5 text-red-500" />,
            danger: true,
            onClick: () => setDeviceToRevoke(device),
        },
    ];

    return (
        <div className="flex flex-col gap-4 w-full">
            <TableFilterBar
                searchQuery={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search device ID, drone, or socket..."
                statusFilter={statusFilter}
                onStatusFilterChange={(val) =>
                    setStatusFilter(val as "all" | DeviceConnectionStatus)
                }
                statusOptions={DEVICE_STATUS_OPTIONS}
            />

            <ChamferCard size="lg" className="w-full">
                <Table fixed>
                    <TableHeader>
                        <TableRow>
                            <TableHead width="180px">DEVICE IDENTIFIER</TableHead>
                            <TableHead width="220px">DRONE / MODEL</TableHead>
                            <TableHead width="130px">STATUS</TableHead>
                            <TableHead width="180px">SOCKET ID</TableHead>
                            <TableHead width="160px">LAST SEEN</TableHead>
                            <TableHead width="80px" align="right">
                                ACTIONS
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={6} message="Loading registered devices..." />
                        ) : filteredDevices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center">
                                    <EmptyState
                                        icon={Radio}
                                        title="No registered devices found"
                                        description="Try adjusting your search query or status filter."
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((device) => {
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
                                                <span className="font-semibold text-[var(--color-text-primary)] truncate">
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
                                                ? `${formatDateTime(device.lastSeenAt, "MMM dd, HH:mm")} (${formatRelativeTime(device.lastSeenAt)})`
                                                : "Never"}
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(device)} />
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

            <ConfirmDialog
                isOpen={Boolean(deviceToRevoke)}
                onClose={() => setDeviceToRevoke(null)}
                onConfirm={() => {
                    if (deviceToRevoke) {
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
        </div>
    );
}
