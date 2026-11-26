"use client";

import { useCallback, useState } from "react";
import {
    ChamferButton,
    PageHeader,
    ErrorState,
    UnderlineTabs,
    type UnderlineTabItem,
} from "@/components/ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SimulationTable, AddSimulationModal, DeviceHeartbeatTable } from "@/components/simulation";
import { simulationService } from "@/services/simulationService";
import { useCrudList, useConnectivityDevices, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ONLINE_DEVICE_STATUS,
    type SimulationSession,
    type CreateSimulationSessionPayload,
} from "@/types";

type SimulationTab = "sessions" | "devices";

export default function SimulationPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<SimulationTab>("sessions");

    const fetchSessions = useCallback(() => simulationService.getAll(), []);
    const deleteSession = useCallback((id: string) => simulationService.deleteSession(id), []);

    const {
        items: sessions,
        loading,
        isError,
        refresh: refreshSessions,
        isModalOpen: isLaunchOpen,
        openCreateModal: openLaunchModal,
        closeModal,
        handleDelete: handleDeleteSession,
    } = useCrudList<SimulationSession>({
        queryKey: QUERY_KEYS.simulation,
        fetchFn: fetchSessions,
        deleteFn: deleteSession,
        entityName: "Simulation Session",
        refetchInterval: 3000,
    });

    const {
        data: devices = [],
        isLoading: devicesLoading,
        refetch: refetchDevices,
    } = useConnectivityDevices();

    const createSessionMutation = useMutation({
        mutationFn: (payload: CreateSimulationSessionPayload) =>
            simulationService.createSession(payload),
        onSuccess: () => {
            toast.success("Simulation session launched successfully");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drones });
        },
        meta: { defaultErrorMessage: "Failed to launch simulation session" },
    });

    const pauseSessionMutation = useMutation({
        mutationFn: (id: string) => simulationService.pauseSession(id),
        onSuccess: () => {
            toast.success("Simulation paused");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
        },
        meta: { defaultErrorMessage: "Failed to pause simulation" },
    });

    const resumeSessionMutation = useMutation({
        mutationFn: (id: string) => simulationService.resumeSession(id),
        onSuccess: () => {
            toast.success("Simulation resumed");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
        },
        meta: { defaultErrorMessage: "Failed to resume simulation" },
    });

    const stopSessionMutation = useMutation({
        mutationFn: (id: string) => simulationService.stopSession(id),
        onSuccess: () => {
            toast.success("Simulation stopped");
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drones });
        },
        meta: { defaultErrorMessage: "Failed to stop simulation" },
    });

    const handleOpenLaunchModal = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drones });
        openLaunchModal();
    }, [queryClient, openLaunchModal]);

    const powerOnMutation = useMutation({
        mutationFn: (id: string) => simulationService.powerOnDevice(id),
        onSuccess: (_data, id) => {
            toast.success(`Device ${id.slice(0, 8)} powered ON`);
            refetchDevices();
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
        },
        meta: { defaultErrorMessage: "Failed to power ON device" },
    });

    const powerOffMutation = useMutation({
        mutationFn: (id: string) => simulationService.powerOffDevice(id),
        onSuccess: (_data, id) => {
            toast.success(`Device ${id.slice(0, 8)} powered OFF`);
            refetchDevices();
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
        },
        meta: { defaultErrorMessage: "Failed to power OFF device" },
    });

    const onlineCount = devices.filter((d) => d.connectionStatus === ONLINE_DEVICE_STATUS).length;

    const tabs: readonly UnderlineTabItem<SimulationTab>[] = [
        { id: "sessions", label: "Flight Sessions", count: sessions.length },
        { id: "devices", label: "Virtual Devices", count: devices.length },
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full">
            <PageHeader title="SIMULATION">
                <ChamferButton variant="dark" size="sm" onClick={handleOpenLaunchModal}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Launch Simulation</span>
                </ChamferButton>
            </PageHeader>

            <UnderlineTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel="Simulation views"
                rightSlot={
                    activeTab === "devices" && devices.length > 0 ? (
                        <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                            <strong className="text-emerald-600 tabular-nums">{onlineCount}</strong>{" "}
                            / {devices.length} Online
                        </span>
                    ) : undefined
                }
            />

            {activeTab === "sessions" ? (
                isError && sessions.length === 0 ? (
                    <ErrorState
                        title="Unable to load simulation sessions"
                        description="The Simulation Service could not be reached. Please try again."
                        onRetry={refreshSessions}
                    />
                ) : (
                    <SimulationTable
                        sessions={sessions}
                        loading={loading}
                        onPauseSession={(id) => pauseSessionMutation.mutate(id)}
                        onResumeSession={(id) => resumeSessionMutation.mutate(id)}
                        onStopSession={(id) => stopSessionMutation.mutate(id)}
                        onDeleteSession={handleDeleteSession}
                        onRefresh={() =>
                            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation })
                        }
                    />
                )
            ) : (
                <DeviceHeartbeatTable
                    devices={devices}
                    loading={devicesLoading}
                    onPowerOnDevice={(id) => powerOnMutation.mutateAsync(id)}
                    onPowerOffDevice={(id) => powerOffMutation.mutateAsync(id)}
                />
            )}

            <AddSimulationModal
                isOpen={isLaunchOpen}
                onClose={closeModal}
                activeSessions={sessions}
                onSubmit={async (payload) => {
                    await createSessionMutation.mutateAsync(payload);
                }}
            />
        </div>
    );
}
