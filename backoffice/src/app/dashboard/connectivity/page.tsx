"use client";

import { useState } from "react";
import { PageHeader, ChamferButton, AlertBanner } from "@/components/ui";
import { RotateCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ConnectivityMetrics,
    ConnectivityTabs,
    type ConnectivitySubTab,
    OverviewTab,
    RegisteredDevicesTable,
    TelemetryModesPanel,
    AddDeviceModal,
} from "@/components/connectivity";
import { connectivityService } from "@/services/connectivityService";
import { useConnectivityDevices, useConnectivityOnlineDevices, QUERY_KEYS } from "@/hooks";
import { OFFLINE_DEVICE_STATUS, type DeviceRegistrationPayload } from "@/types";

export default function ConnectivityPage() {
    const [activeSubTab, setActiveSubTab] = useState<ConnectivitySubTab>("overview");
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const queryClient = useQueryClient();

    const {
        data: devices = [],
        isLoading: devicesLoading,
        error: devicesError,
        refetch: refetchDevices,
    } = useConnectivityDevices();

    const {
        data: onlineDevices = [],
        isLoading: onlineLoading,
        refetch: refetchOnline,
    } = useConnectivityOnlineDevices();

    const loading = devicesLoading || onlineLoading;
    const error = devicesError ? "Failed to fetch devices" : null;

    const refreshAll = () => {
        refetchDevices();
        refetchOnline();
    };

    const registerDeviceMutation = useMutation({
        mutationFn: (payload: DeviceRegistrationPayload) =>
            connectivityService.registerDevice(payload),
        onSuccess: () => {
            toast.success("Device registered successfully");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
        },
        meta: { defaultErrorMessage: "Failed to register device" },
    });

    const heartbeatMutation = useMutation({
        mutationFn: (id: string) => connectivityService.sendHeartbeat(id),
        onSuccess: () => {
            toast.success("Device heartbeat pinged successfully");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
        },
        meta: { defaultErrorMessage: "Failed to ping device heartbeat" },
    });

    const revokeDeviceMutation = useMutation({
        mutationFn: (id: string) => connectivityService.revokeDevice(id),
        onSuccess: () => {
            toast.success("Device registration revoked");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
        },
        meta: { defaultErrorMessage: "Failed to revoke device registration" },
    });

    const onlineCount = onlineDevices.length;
    const offlineCount = devices.filter((d) => d.connectionStatus === OFFLINE_DEVICE_STATUS).length;

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="Device Connectivity">
                <ChamferButton variant="outline" size="sm" clip="xs" onClick={refreshAll}>
                    <RotateCw className="w-3.5 h-3.5 text-slate-600" />
                    <span>Refresh</span>
                </ChamferButton>

                <ChamferButton variant="dark" size="sm" onClick={() => setIsRegisterOpen(true)}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Register Device</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => {}} />}

            <ConnectivityMetrics
                totalDevices={devices.length}
                activeDevices={onlineCount}
                onlineDevices={onlineCount}
                pendingCommands={0}
                protocolStatusCount={onlineCount}
            />

            <ConnectivityTabs activeTab={activeSubTab} onTabChange={setActiveSubTab} />

            {activeSubTab === "overview" && (
                <OverviewTab
                    onlineCount={onlineCount}
                    offlineCount={offlineCount}
                    onlineDevices={onlineDevices}
                    totalDevicesCount={devices.length}
                    loading={loading}
                    onHeartbeat={heartbeatMutation.mutate}
                    onRevoke={revokeDeviceMutation.mutate}
                    onTroubleshootGateway={() => setActiveSubTab("telemetry-modes")}
                    onProvisionEdgeAgent={() => setIsRegisterOpen(true)}
                    onViewAllDevices={() => setActiveSubTab("devices")}
                />
            )}

            {activeSubTab === "devices" && (
                <RegisteredDevicesTable
                    devices={devices}
                    loading={loading}
                    onHeartbeat={heartbeatMutation.mutate}
                    onRevoke={revokeDeviceMutation.mutate}
                />
            )}

            {activeSubTab === "telemetry-modes" && (
                <TelemetryModesPanel
                    counts={{
                        idle: offlineCount,
                        normal: onlineCount,
                        enhanced: 0,
                        emergency: 0,
                    }}
                />
            )}

            <AddDeviceModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSubmit={registerDeviceMutation.mutateAsync}
            />
        </div>
    );
}
