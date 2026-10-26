"use client";

import { useState, useCallback } from "react";
import { PageHeader, ChamferButton, OutlineButton, AlertBanner } from "@/components/ui";
import { RotateCw, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ConnectivityMetrics,
    ConnectivityTabs,
    ConnectivitySubTab,
    TelemetryDistribution,
    CommandQueue,
    ConnectedDevicesPanel,
    RegisteredDevicesTable,
    TelemetryModesPanel,
    AddDeviceModal,
} from "@/components/connectivity";
import { connectivityService } from "@/services/connectivityService";
import { QUERY_KEYS } from "@/hooks";
import type { DeviceRegistrationPayload } from "@/types";

export default function ConnectivityPage() {
    const [activeSubTab, setActiveSubTab] = useState<ConnectivitySubTab>("overview");
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const queryClient = useQueryClient();

    const {
        data: devices = [],
        isLoading: devicesLoading,
        error: devicesError,
        refetch: refetchDevices,
    } = useQuery({
        queryKey: QUERY_KEYS.connectivityDevices,
        queryFn: async () => {
            const res = await connectivityService.getDevices();
            return res?.items || [];
        },
    });

    const {
        data: onlineDevices = [],
        isLoading: onlineLoading,
        refetch: refetchOnline,
    } = useQuery({
        queryKey: ["connectivity", "online"] as const,
        queryFn: async () => {
            try {
                const res = await connectivityService.getOnlineDevices();
                return res || [];
            } catch {
                return devices.filter((d) => d.connectionStatus === "online");
            }
        },
        enabled: devices.length >= 0,
    });

    const loading = devicesLoading || onlineLoading;
    const error = devicesError ? "Failed to fetch devices" : null;

    const refreshAll = useCallback(() => {
        refetchDevices();
        refetchOnline();
    }, [refetchDevices, refetchOnline]);

    const registerDeviceMutation = useMutation({
        mutationFn: (payload: DeviceRegistrationPayload) =>
            connectivityService.registerDevice(payload),
        onSuccess: () => {
            toast.success("Device registered successfully");
            queryClient.invalidateQueries({ queryKey: ["connectivity"] });
        },
        meta: { defaultErrorMessage: "Failed to register device" },
    });

    const heartbeatMutation = useMutation({
        mutationFn: (id: string) => connectivityService.sendHeartbeat(id),
        onSuccess: () => {
            toast.success("Device heartbeat pinged successfully");
            queryClient.invalidateQueries({ queryKey: ["connectivity"] });
        },
        meta: { defaultErrorMessage: "Failed to ping device heartbeat" },
    });

    const revokeDeviceMutation = useMutation({
        mutationFn: (id: string) => connectivityService.revokeDevice(id),
        onSuccess: () => {
            toast.success("Device registration revoked");
            queryClient.invalidateQueries({ queryKey: ["connectivity"] });
        },
        meta: { defaultErrorMessage: "Failed to revoke device registration" },
    });

    const handleRegisterDevice = async (payload: DeviceRegistrationPayload) => {
        await registerDeviceMutation.mutateAsync(payload);
    };

    const handleHeartbeat = (id: string) => {
        heartbeatMutation.mutate(id);
    };

    const handleRevoke = (id: string) => {
        revokeDeviceMutation.mutate(id);
    };

    const totalCount = devices.length;
    const onlineCount = onlineDevices.length;
    const activeCount = onlineCount;

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="Device Connectivity">
                <OutlineButton size="sm" onClick={refreshAll}>
                    <RotateCw className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Refresh</span>
                </OutlineButton>

                <ChamferButton variant="dark" size="sm" onClick={() => setIsRegisterOpen(true)}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Register Device</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => {}} />}

            <ConnectivityMetrics
                totalDevices={totalCount}
                activeDevices={activeCount}
                onlineDevices={onlineCount}
                pendingCommands={0}
                protocolStatusCount={onlineCount}
            />

            <ConnectivityTabs
                activeTab={activeSubTab}
                onTabChange={(tab) => setActiveSubTab(tab)}
            />

            {activeSubTab === "overview" && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        <TelemetryDistribution
                            frequencyBand="DUAL-BAND"
                            hasFeeds={onlineCount > 0}
                            byMode={{
                                idle: devices.filter((d) => d.connectionStatus === "offline")
                                    .length,
                                normal: onlineCount,
                                enhanced: 0,
                                emergency: 0,
                            }}
                        />
                        <CommandQueue
                            latency="0ms"
                            pendingCount={0}
                            byPriority={{ 0: 0, 1: 0, 2: 0, 3: 0 }}
                        />
                    </div>

                    <ConnectedDevicesPanel
                        status={onlineCount > 0 ? `ONLINE (${onlineCount})` : "STANDBY"}
                        devices={onlineDevices}
                        loading={loading}
                        onHeartbeat={handleHeartbeat}
                        onRevoke={handleRevoke}
                        onTroubleshootGateway={() => setActiveSubTab("telemetry-modes")}
                        onProvisionEdgeAgent={() => setIsRegisterOpen(true)}
                    />
                </>
            )}

            {activeSubTab === "devices" && (
                <RegisteredDevicesTable
                    devices={devices}
                    loading={loading}
                    onRefresh={refreshAll}
                    onRegisterDevice={() => setIsRegisterOpen(true)}
                    onHeartbeat={handleHeartbeat}
                    onRevoke={handleRevoke}
                />
            )}

            {activeSubTab === "telemetry-modes" && (
                <TelemetryModesPanel
                    counts={{
                        idle: devices.filter((d) => d.connectionStatus === "offline").length,
                        normal: onlineCount,
                        enhanced: 0,
                        emergency: 0,
                    }}
                />
            )}

            <AddDeviceModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSubmit={handleRegisterDevice}
            />
        </div>
    );
}
