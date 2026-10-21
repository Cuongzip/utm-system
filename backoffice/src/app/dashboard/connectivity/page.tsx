"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, ChamferButton, OutlineButton } from "@/components/ui";
import { RotateCw, Plus } from "lucide-react";
import {
    ConnectivityAlert,
    ConnectivityMetrics,
    ConnectivityTabs,
    ConnectivitySubTab,
    TelemetryDistribution,
    CommandQueue,
    ConnectedDevicesPanel,
    RegisteredDevicesTable,
    TelemetryModesPanel,
    RegisterDeviceModal,
} from "@/components/connectivity";
import { connectivityService } from "@/services/connectivityService";
import type { DeviceRegistration, DeviceRegistrationPayload } from "@/types";

export default function ConnectivityPage() {
    const [activeSubTab, setActiveSubTab] = useState<ConnectivitySubTab>("overview");
    const [devices, setDevices] = useState<DeviceRegistration[]>([]);
    const [onlineDevices, setOnlineDevices] = useState<DeviceRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const devicesRes = await connectivityService.getDevices();
            const items = devicesRes?.items || [];
            setDevices(items);

            try {
                const onlineRes = await connectivityService.getOnlineDevices();
                setOnlineDevices(onlineRes || []);
            } catch {
                setOnlineDevices(items.filter((d) => d.connectionStatus === "online"));
            }

            setError(null);
        } catch {
            setError("Failed to fetch devices");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRegisterDevice = async (payload: DeviceRegistrationPayload) => {
        await connectivityService.registerDevice(payload);
        await fetchData();
    };

    const handleHeartbeat = async (id: string) => {
        try {
            await connectivityService.sendHeartbeat(id);
            await fetchData();
        } catch {
            setError("Failed to ping device heartbeat");
        }
    };

    const handleRevoke = async (id: string) => {
        try {
            await connectivityService.revokeDevice(id);
            await fetchData();
        } catch {
            setError("Failed to revoke device registration");
        }
    };

    const totalCount = devices.length;
    const onlineCount = onlineDevices.length;
    const activeCount = onlineCount;

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="Device Connectivity">
                <OutlineButton size="sm" onClick={fetchData}>
                    <RotateCw className="w-3.5 h-3.5 text-[#334155]" />
                    <span>Refresh</span>
                </OutlineButton>

                <ChamferButton variant="dark" size="sm" onClick={() => setIsRegisterOpen(true)}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Register Device</span>
                </ChamferButton>
            </PageHeader>

            {error && <ConnectivityAlert message={error} onDismiss={() => setError(null)} />}

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
                    onRefresh={fetchData}
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

            <RegisterDeviceModal
                isOpen={isRegisterOpen}
                onClose={() => setIsRegisterOpen(false)}
                onSubmit={handleRegisterDevice}
            />
        </div>
    );
}
