"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Radio, Power, PowerOff, Loader2 } from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
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
import { formatRelativeTime, formatDateTime, compareCreatedDesc } from "@/utils";

interface DeviceHeartbeatTableProps {
    devices: DeviceRegistration[];
    loading: boolean;
    onPowerOnDevice: (id: string) => Promise<void> | void;
    onPowerOffDevice: (id: string) => Promise<void> | void;
}

export function DeviceHeartbeatTable({
    devices = [],
    loading = false,
    onPowerOnDevice,
    onPowerOffDevice,
}: DeviceHeartbeatTableProps) {
    const t = useTranslations("simulation.devicesTable");
    const tCommon = useTranslations("common");
    const [pendingDevices, setPendingDevices] = useState<Record<string, boolean>>({});
    const sortedDevices = useMemo(() => [...devices].sort(compareCreatedDesc), [devices]);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(sortedDevices);

    const handleTogglePower = async (deviceId: string, isCurrentlyOnline: boolean) => {
        setPendingDevices((prev) => ({ ...prev, [deviceId]: true }));
        try {
            if (isCurrentlyOnline) {
                await onPowerOffDevice(deviceId);
            } else {
                await onPowerOnDevice(deviceId);
            }
        } finally {
            setPendingDevices((prev) => {
                const next = { ...prev };
                delete next[deviceId];
                return next;
            });
        }
    };

    return (
        <ChamferCard size="lg" className="w-full">
            <Table fixed={false}>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("colDeviceId")}</TableHead>
                        <TableHead>{t("colDrone")}</TableHead>
                        <TableHead>{t("colConnectionStatus")}</TableHead>
                        <TableHead>{t("colLastHeartbeat")}</TableHead>
                        <TableHead align="right">{t("colVirtualPower")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableLoading colSpan={5} message={t("loading")} />
                    ) : devices.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="py-10 text-center">
                                <EmptyState
                                    icon={Radio}
                                    title={t("emptyTitle")}
                                    description={t("emptyDesc")}
                                />
                            </TableCell>
                        </TableRow>
                    ) : (
                        paginatedItems.map((device) => {
                            const deviceId = device.id;
                            const isOnline = device.connectionStatus === ONLINE_DEVICE_STATUS;
                            const isPending = Boolean(pendingDevices[deviceId]);

                            const droneText =
                                device.droneRegistrationNumber ||
                                (device.droneId
                                    ? `DRN-${device.droneId.slice(0, 8).toUpperCase()}`
                                    : "—");
                            const lastSeenRelative = device.lastSeenAt
                                ? formatRelativeTime(device.lastSeenAt)
                                : tCommon("never");
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
                                            <span className="font-mono font-medium text-slate-900">
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
                                        mono
                                        muted
                                        truncate
                                        tooltip={lastSeenTooltip}
                                        className="text-xs"
                                    >
                                        {lastSeenRelative}
                                    </TableCell>
                                    <TableCell align="right">
                                        <ChamferButton
                                            size="xs"
                                            variant={isOnline ? "outline" : "dark"}
                                            clip="xs"
                                            disabled={isPending}
                                            onClick={() => handleTogglePower(deviceId, isOnline)}
                                            title={
                                                isOnline ? t("powerOffTitle") : t("powerOnTitle")
                                            }
                                        >
                                            {isPending ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : isOnline ? (
                                                <PowerOff className="w-3.5 h-3.5" />
                                            ) : (
                                                <Power className="w-3.5 h-3.5" />
                                            )}
                                            <span>{isOnline ? t("powerOff") : t("powerOn")}</span>
                                        </ChamferButton>
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
    );
}
