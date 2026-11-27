"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
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
import {
    formatDateTime,
    formatRelativeTime,
    createStatusOptions,
    compareCreatedDesc,
} from "@/utils";

function isKnownMode(val: string): val is TelemetryMode {
    return (TELEMETRY_MODES as readonly string[]).includes(val);
}

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
    const t = useTranslations("connectivity.table");
    const tModes = useTranslations("connectivity.modes");
    const tConn = useTranslations("connectivity");
    const tCommon = useTranslations("common");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | DeviceConnectionStatus>("all");
    const [deviceToRevoke, setDeviceToRevoke] = useState<DeviceRegistration | null>(null);
    const [modeTargetDevice, setModeTargetDevice] = useState<DeviceRegistration | null>(null);
    const [selectedMode, setSelectedMode] = useState<TelemetryMode>("normal");
    const [modeReason, setModeReason] = useState("");

    const deviceStatusOptions: SelectOption[] = createStatusOptions(DEVICE_CONNECTION_STATUSES);

    const telemetryModeOptions: SelectOption[] = useMemo(() => {
        const cfgMap = new Map(modeConfigs.filter((c) => Boolean(c.mode)).map((c) => [c.mode!, c]));
        return TELEMETRY_MODES.map((mode) => {
            const cfg = cfgMap.get(mode);
            if (cfg && cfg.rateHz != null) {
                return {
                    value: mode,
                    label: `${tModes(mode)} (${cfg.rateHz} Hz${cfg.intervalMs ? ` · ${cfg.intervalMs}ms` : ""})`,
                };
            }
            return {
                value: mode,
                label: tModes(`${mode}Full`),
            };
        });
    }, [modeConfigs, tModes]);

    const sortedDevices = useMemo(() => {
        return [...devices].sort(compareCreatedDesc);
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
            label: t("pingHeartbeat"),
            icon: <Activity className="w-3.5 h-3.5 text-emerald-600" />,
            onClick: () => onHeartbeat(device.id),
        },
        {
            label: t("x509Certificate"),
            icon: <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />,
            onClick: () => onManageCertificate(device),
        },
        {
            label: t("telemetryMode"),
            icon: <Gauge className="w-3.5 h-3.5 text-slate-600" />,
            onClick: () => openModeModal(device),
        },
        {
            label: t("revokeDevice"),
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
                searchPlaceholder={t("searchPlaceholder")}
                statusFilter={statusFilter}
                onStatusFilterChange={(val) => {
                    setStatusFilter(val as "all" | DeviceConnectionStatus);
                    setCurrentPage(1);
                }}
                statusOptions={deviceStatusOptions}
                onClearFilters={clearFilters}
                totalCount={devices.length}
                filteredCount={filteredDevices.length}
                itemLabel={t("itemLabel")}
            />

            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("colDeviceId")}</TableHead>
                            <TableHead>{t("colDroneModel")}</TableHead>
                            <TableHead>{t("colStatus")}</TableHead>
                            <TableHead>{t("colTelemetry")}</TableHead>
                            <TableHead>{t("colSocket")}</TableHead>
                            <TableHead>{t("colLastSeen")}</TableHead>
                            <TableHead align="right">{t("colActions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={7} message={t("loading")} />
                        ) : filteredDevices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-10 text-center">
                                    <EmptyState
                                        icon={Radio}
                                        title={
                                            hasFilters ? t("emptyFilteredTitle") : t("emptyTitle")
                                        }
                                        description={
                                            hasFilters ? t("emptyFilteredDesc") : t("emptyDesc")
                                        }
                                        action={
                                            hasFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={clearFilters}
                                                >
                                                    {t("clearFilters")}
                                                </ChamferButton>
                                            ) : onRegisterDevice ? (
                                                <ChamferButton
                                                    variant="dark"
                                                    size="sm"
                                                    onClick={onRegisterDevice}
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span>{tConn("registerDevice")}</span>
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
                                const modeDisplay = isKnownMode(activeMode)
                                    ? tModes(activeMode)
                                    : activeMode;
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
                                                    {device.droneRegistrationNumber ||
                                                        t("unlinked")}
                                                </span>
                                                {device.droneModel && (
                                                    <span className="text-[11px] text-[var(--color-text-muted)] truncate">
                                                        {device.droneModel}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={currentStatus} />
                                        </TableCell>
                                        <TableCell>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono text-[10px] font-bold uppercase text-slate-700">
                                                {modeDisplay}
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
                                                : tCommon("never")}
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
                    itemLabel={t("itemLabel")}
                />
            </ChamferCard>

            <Modal
                isOpen={Boolean(modeTargetDevice)}
                onClose={() => setModeTargetDevice(null)}
                title={t("modeModalTitle", { id: modeTargetDevice?.deviceIdentifier || "" })}
                maxWidth={440}
                footer={
                    <>
                        <ChamferButton
                            variant="outline"
                            size="sm"
                            clip="xs"
                            onClick={() => setModeTargetDevice(null)}
                        >
                            {tCommon("cancel")}
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
                            {t("applyMode")}
                        </ChamferButton>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="form-group">
                        <label htmlFor="deviceTelemetryMode" className="form-label">
                            {t("rateModeLabel")}
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
                        label={t("reasonLabel")}
                        value={modeReason}
                        onChange={(e) => setModeReason(e.target.value)}
                        placeholder={t("reasonPlaceholder")}
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
                title={t("revokeTitle")}
                description={
                    <span>
                        {t("revokeDescPrefix")}
                        <strong className="text-slate-900 font-mono">
                            {deviceToRevoke?.deviceIdentifier || t("revokeDescFallback")}
                        </strong>
                        {t("revokeDescSuffix")}
                    </span>
                }
                confirmText={t("revokeDevice")}
            />
        </div>
    );
}
