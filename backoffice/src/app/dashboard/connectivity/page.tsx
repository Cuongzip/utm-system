"use client";

import { useMemo, useState } from "react";
import { PageHeader, ChamferButton, ErrorState } from "@/components/ui";
import { RotateCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ConnectivityMetrics,
    TelemetryDistribution,
    RegisteredDevicesTable,
    AddDeviceModal,
    DeviceCertificateModal,
} from "@/components/connectivity";
import { connectivityService } from "@/services/connectivityService";
import {
    useConnectivityDevices,
    useConnectivityOnlineDevices,
    useConnectivityStatus,
    useConnectivityTelemetryModes,
    QUERY_KEYS,
} from "@/hooks";
import {
    OFFLINE_DEVICE_STATUS,
    type DeviceRegistration,
    type DeviceRegistrationPayload,
    type TelemetryMode,
} from "@/types";

export default function ConnectivityPage() {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [certDevice, setCertDevice] = useState<DeviceRegistration | null>(null);
    const queryClient = useQueryClient();

    const {
        data: devices = [],
        isLoading: devicesLoading,
        isError: devicesError,
        refetch: refetchDevices,
    } = useConnectivityDevices();

    const {
        data: onlineDevices = [],
        isLoading: onlineLoading,
        refetch: refetchOnline,
    } = useConnectivityOnlineDevices();

    const {
        data: gatewayStatus,
        isError: statusError,
        refetch: refetchStatus,
    } = useConnectivityStatus();
    const { data: telemetryModeConfigs = [] } = useConnectivityTelemetryModes();

    const loading = devicesLoading || onlineLoading;
    const hasError = devicesError && statusError && devices.length === 0;

    const refreshAll = () => {
        refetchDevices();
        refetchOnline();
        refetchStatus();
    };

    const registerDeviceMutation = useMutation({
        mutationFn: (payload: DeviceRegistrationPayload) =>
            connectivityService.registerDevice(payload),
        onSuccess: () => {
            toast.success("Device registered successfully");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityStatus });
        },
        meta: { defaultErrorMessage: "Failed to register device" },
    });

    const heartbeatMutation = useMutation({
        mutationFn: (id: string) => connectivityService.sendHeartbeat(id),
        onSuccess: () => {
            toast.success("Device heartbeat pinged successfully");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityStatus });
        },
        meta: { defaultErrorMessage: "Failed to ping device heartbeat" },
    });

    const revokeDeviceMutation = useMutation({
        mutationFn: (id: string) => connectivityService.revokeDevice(id),
        onSuccess: () => {
            toast.success("Device registration revoked");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityStatus });
        },
        meta: { defaultErrorMessage: "Failed to revoke device registration" },
    });

    const setTelemetryModeMutation = useMutation({
        mutationFn: ({
            deviceId,
            mode,
            reason,
        }: {
            deviceId: string;
            mode: TelemetryMode;
            reason?: string;
        }) => connectivityService.setDeviceTelemetryMode(deviceId, { mode, reason }),
        onSuccess: (res) => {
            toast.success(
                `Telemetry mode switched to ${(res.telemetryMode ?? "updated").toUpperCase()}${res.rateHz ? ` (${res.rateHz} Hz)` : ""}`
            );
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityStatus });
        },
        meta: { defaultErrorMessage: "Failed to update device telemetry mode" },
    });

    const onlineCount = gatewayStatus?.onlineDevices ?? onlineDevices.length;
    const totalDevicesCount = gatewayStatus?.totalDevices ?? devices.length;
    const offlineCount = devices.filter((d) => d.connectionStatus === OFFLINE_DEVICE_STATUS).length;

    const telemetryByMode = useMemo(() => {
        if (gatewayStatus?.telemetry?.byMode) {
            return {
                idle: gatewayStatus.telemetry.byMode.idle ?? 0,
                normal: gatewayStatus.telemetry.byMode.normal ?? 0,
                enhanced: gatewayStatus.telemetry.byMode.enhanced ?? 0,
                emergency: gatewayStatus.telemetry.byMode.emergency ?? 0,
            };
        }
        const computed = { idle: 0, normal: 0, enhanced: 0, emergency: 0 };
        for (const d of devices) {
            const m = d.telemetryMode;
            if (m && m in computed) {
                computed[m as keyof typeof computed] += 1;
            } else if (d.connectionStatus === OFFLINE_DEVICE_STATUS) {
                computed.idle += 1;
            } else {
                computed.normal += 1;
            }
        }
        if (devices.length === 0 && offlineCount > 0) {
            computed.idle = offlineCount;
        }
        return computed;
    }, [gatewayStatus, devices, offlineCount]);

    const certProvisionedCount = useMemo(
        () => devices.filter((d) => Boolean(d.certificateFingerprint)).length,
        [devices]
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title="DEVICE CONNECTIVITY">
                <ChamferButton variant="outline" size="sm" clip="xs" onClick={refreshAll}>
                    <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Refresh</span>
                </ChamferButton>

                <ChamferButton variant="dark" size="sm" onClick={() => setIsRegisterOpen(true)}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Register Device</span>
                </ChamferButton>
            </PageHeader>

            {hasError ? (
                <ErrorState
                    title="Unable to reach Connectivity Gateway"
                    description="Device status and protocol telemetry could not be loaded. Please try again."
                    onRetry={refreshAll}
                />
            ) : (
                <>
                    <ConnectivityMetrics
                        totalDevices={totalDevicesCount}
                        onlineDevices={onlineCount}
                        certProvisionedCount={certProvisionedCount}
                        totalRoutedCommands={gatewayStatus?.commands?.totalRouted ?? 0}
                        loading={loading}
                    />

                    <TelemetryDistribution
                        frequencyBand="ADAPTIVE"
                        byMode={telemetryByMode}
                        modeConfigs={telemetryModeConfigs}
                    />

                    <RegisteredDevicesTable
                        devices={devices}
                        modeConfigs={telemetryModeConfigs}
                        loading={loading}
                        onHeartbeat={heartbeatMutation.mutate}
                        onRevoke={revokeDeviceMutation.mutate}
                        onManageCertificate={setCertDevice}
                        onSetTelemetryMode={(deviceId, mode, reason) =>
                            setTelemetryModeMutation.mutate({ deviceId, mode, reason })
                        }
                        isUpdatingMode={setTelemetryModeMutation.isPending}
                        onRegisterDevice={() => setIsRegisterOpen(true)}
                    />
                </>
            )}

            <AddDeviceModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSubmit={registerDeviceMutation.mutateAsync}
            />

            <DeviceCertificateModal
                isOpen={Boolean(certDevice)}
                device={certDevice}
                onClose={() => setCertDevice(null)}
            />
        </div>
    );
}
