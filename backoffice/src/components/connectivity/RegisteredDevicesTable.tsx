"use client";

import { useState, useMemo } from "react";
import { Activity, Trash2, Radio, ShieldCheck, Gauge, Plus } from "lucide-react";
import {
    ChamferCard,
    StatusBadge,
    TableFilterBar,
    type SelectOption,
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
    Modal,
    CustomSelect,
    FormInput,
    ChamferButton,
} from "@/components/ui";
import { usePagination } from "@/hooks";
import {
    OFFLINE_DEVICE_STATUS,
    DEVICE_CONNECTION_STATUSES,
    TELEMETRY_MODES,
    type DeviceRegistration,
    type DeviceConnectionStatus,
    type TelemetryMode,
    type TelemetryModeConfig,
} from "@/types";
import { formatDateTime, formatRelativeTime, createStatusOptions } from "@/utils";

const DEVICE_STATUS_OPTIONS: SelectOption[] = createStatusOptions(DEVICE_CONNECTION_STATUSES);

const DEFAULT_MODE_LABELS: Record<string, string> = {
    idle: "Idle (0.033 Hz · 30s)",
    normal: "Normal (0.5 Hz · 2s)",
    enhanced: "Enhanced (2 Hz · 500ms)",
    emergency: "Emergency (10 Hz · 100ms)",
};

export interface RegisteredDevicesTableProps {
    devices: DeviceRegistration[];
    modeConfigs?: TelemetryModeConfig[];
    loading: boolean;
    onHeartbeat: (id: string) => void;
    onRevoke: (id: string) => void;
    onManageCertificate: (device: DeviceRegistration) => void;
    onSetTelemetryMode: (deviceId: string, mode: TelemetryMode, reason?: string) => void;
    isUpdatingMode?: boolean;
    onRegisterDevice?: () => void;
}

export function RegisteredDevicesTable({
    devices = [],
    modeConfigs = [],
    loading = false,
    onHeartbeat,
    onRevoke,
    onManageCertificate,
    onSetTelemetryMode,
    isUpdatingMode = false,
    onRegisterDevice,
}: RegisteredDevicesTableProps) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | DeviceConnectionStatus>("all");
    const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceRegistration | null>(null);
    const [modeTargetDevice, setModeTargetDevice] = useState<DeviceRegistration | null>(null);
    const [selectedMode, setSelectedMode] = useState<TelemetryMode>("normal");
    const [modeReason, setModeReason] = useState("");

    const telemetryModeOptions: SelectOption[] = useMemo(() => {
        const cfgMap = new Map(modeConfigs.filter((c) => Boolean(c.mode)).map((c) => [c.mode!, c]));
        return TELEMETRY_MODES.map((mode) => {
            const cfg = cfgMap.get(mode);
            if (cfg && cfg.rateHz != null) {
                const title = mode.charAt(0).toUpperCase() + mode.slice(1);
                return {
                    value: mode,
                    label: `${title} (${cfg.rateHz} Hz${cfg.intervalMs ? ` · ${cfg.intervalMs}ms` : ""})`,
                };
            }
            return {
                value: mode,
                label: DEFAULT_MODE_LABELS[mode] ?? mode.toUpperCase(),
            };
        });
    }, [modeConfigs]);

    const sortedDevices = useMemo(() => {
        return [...devices].sort((a, b) => {
            const aOnline = a.connectionStatus !== OFFLINE_DEVICE_STATUS ? 0 : 1;
            const bOnline = b.connectionStatus !== OFFLINE_DEVICE_STATUS ? 0 : 1;
            if (aOnline !== bOnline) return aOnline - bOnline;
            return (a.deviceIdentifier || "").localeCompare(b.deviceIdentifier || "");
        });
    }, [devices]);

    const hasFilters = Boolean(search.trim()) || statusFilter !== "all";

    const filteredDevices = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sortedDevices.filter((d) => {
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
    }, [sortedDevices, search, statusFilter]);

    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(filteredDevices);

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("all");
        setCurrentPage(1);
    };

    const openModeModal = (device: DeviceRegistration) => {
        setModeTargetDevice(device);
        setSelectedMode((device.telemetryMode as TelemetryMode) ?? "normal");
        setModeReason(device.telemetryModeReason ?? "");
    };

    const getActions = (device: DeviceRegistration): ActionMenuItem[] => [
        {
            label: "Ping Heartbeat",
            icon: <Activity className="w-3.5 h-3.5 text-emerald-600" />,
            onClick: () => onHeartbeat(device.id),
        },
        {
            label: "X.509 Certificate",
            icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />,
            onClick: () => onManageCertificate(device),
        },
        {
            label: "Telemetry Mode",
            icon: <Gauge className="w-3.5 h-3.5 text-slate-600" />,
            onClick: () => openModeModal(device),
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
                onSearchChange={(val) => {
                    setSearch(val);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Search device ID, drone registration, or socket..."
                statusFilter={statusFilter}
                onStatusFilterChange={(val) => {
                    setStatusFilter(val as "all" | DeviceConnectionStatus);
                    setCurrentPage(1);
                }}
                statusOptions={DEVICE_STATUS_OPTIONS}
                onClearFilters={clearFilters}
                totalCount={devices.length}
                filteredCount={filteredDevices.length}
            />

            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>DEVICE IDENTIFIER</TableHead>
                            <TableHead>DRONE / MODEL</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>TELEMETRY</TableHead>
                            <TableHead>SOCKET ID</TableHead>
                            <TableHead>LAST SEEN</TableHead>
                            <TableHead align="right">ACTIONS</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={7} message="Loading registered devices..." />
                        ) : filteredDevices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center">
                                    <EmptyState
                                        icon={Radio}
                                        title={
                                            hasFilters
                                                ? "No matching devices"
                                                : "No registered devices"
                                        }
                                        description={
                                            hasFilters
                                                ? "No devices match your current search or connection filter."
                                                : "Register an onboard drone telemetry unit or edge gateway to begin streaming."
                                        }
                                        action={
                                            hasFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={clearFilters}
                                                >
                                                    Clear Filters
                                                </ChamferButton>
                                            ) : onRegisterDevice ? (
                                                <ChamferButton
                                                    variant="dark"
                                                    size="sm"
                                                    onClick={onRegisterDevice}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>Register Device</span>
                                                </ChamferButton>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((device) => {
                                const currentStatus =
                                    device.connectionStatus ?? OFFLINE_DEVICE_STATUS;
                                const activeMode = device.telemetryMode ?? "idle";
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
                                            className="max-w-[180px]"
                                            tooltip={device.deviceIdentifier}
                                        >
                                            {device.deviceIdentifier || "—"}
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            className="max-w-[200px]"
                                            tooltip={droneTooltip}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-[var(--color-text-primary)] truncate">
                                                    {device.droneRegistrationNumber || "Unlinked"}
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
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono text-[10px] font-bold uppercase text-slate-700">
                                                {activeMode}
                                            </span>
                                        </TableCell>
                                        <TableCell
                                            mono
                                            subtle
                                            truncate
                                            className="max-w-[130px]"
                                            tooltip={device.socketId || undefined}
                                        >
                                            {device.socketId || "—"}
                                        </TableCell>
                                        <TableCell
                                            mono
                                            subtle
                                            className="whitespace-nowrap"
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
                    itemLabel="devices"
                />
            </ChamferCard>

            <Modal
                isOpen={Boolean(modeTargetDevice)}
                onClose={() => setModeTargetDevice(null)}
                title={`Adaptive Telemetry Mode — ${modeTargetDevice?.deviceIdentifier || ""}`}
                maxWidth={440}
                footer={
                    <>
                        <ChamferButton
                            variant="outline"
                            size="sm"
                            clip="xs"
                            onClick={() => setModeTargetDevice(null)}
                        >
                            Cancel
                        </ChamferButton>
                        <ChamferButton
                            variant="dark"
                            size="sm"
                            disabled={isUpdatingMode}
                            onClick={() => {
                                if (modeTargetDevice) {
                                    onSetTelemetryMode(
                                        modeTargetDevice.id,
                                        selectedMode,
                                        modeReason.trim() || undefined
                                    );
                                    setModeTargetDevice(null);
                                }
                            }}
                        >
                            Apply Mode
                        </ChamferButton>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="form-group">
                        <label htmlFor="deviceTelemetryMode" className="form-label">
                            Telemetry Rate Mode
                        </label>
                        <CustomSelect
                            id="deviceTelemetryMode"
                            value={selectedMode}
                            onValueChange={(val) => setSelectedMode(val as TelemetryMode)}
                            options={telemetryModeOptions}
                        />
                    </div>
                    <FormInput
                        id="deviceTelemetryModeReason"
                        label="Operator Reason (optional)"
                        value={modeReason}
                        onChange={(e) => setModeReason(e.target.value)}
                        placeholder="e.g. Terminal corridor high-precision tracking"
                    />
                </div>
            </Modal>

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
            />
        </div>
    );
}
