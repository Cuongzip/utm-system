"use client";

import { useCallback } from "react";
import { ChamferButton, PageHeader, AlertBanner } from "@/components/ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { SimulationTable, AddSimulationModal, DeviceHeartbeatTable } from "@/components/simulation";
import { simulationService } from "@/services/simulationService";
import { useCrudList, useConnectivityDevices, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { SimulationSession, CreateSimulationSessionPayload } from "@/types";

export default function SimulationPage() {
    const queryClient = useQueryClient();
    const fetchSessions = useCallback(() => simulationService.getAll(), []);
    const deleteSession = useCallback((id: string) => simulationService.deleteSession(id), []);

    const {
        items: sessions,
        loading,
        error,
        setError,
        refresh,
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
            refresh();
        },
        meta: { defaultErrorMessage: "Failed to launch simulation session" },
    });

    const pauseSessionMutation = useMutation({
        mutationFn: (id: string) => simulationService.pauseSession(id),
        onSuccess: () => {
            toast.success("Simulation paused");
            refresh();
        },
        meta: { defaultErrorMessage: "Failed to pause simulation" },
    });

    const resumeSessionMutation = useMutation({
        mutationFn: (id: string) => simulationService.resumeSession(id),
        onSuccess: () => {
            toast.success("Simulation resumed");
            refresh();
        },
        meta: { defaultErrorMessage: "Failed to resume simulation" },
    });

    const stopSessionMutation = useMutation({
        mutationFn: (id: string) => simulationService.stopSession(id),
        onSuccess: () => {
            toast.success("Simulation stopped");
            refresh();
        },
        meta: { defaultErrorMessage: "Failed to stop simulation" },
    });

    const powerOnMutation = useMutation({
        mutationFn: (id: string) => simulationService.powerOnDevice(id),
        onSuccess: (_data, id) => {
            toast.success(`Device ${id.slice(0, 8)}... powered ON`);
            refetchDevices();
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
        },
        meta: { defaultErrorMessage: "Failed to power ON device" },
    });

    const powerOffMutation = useMutation({
        mutationFn: (id: string) => simulationService.powerOffDevice(id),
        onSuccess: (_data, id) => {
            toast.success(`Device ${id.slice(0, 8)}... powered OFF`);
            refetchDevices();
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivity });
        },
        meta: { defaultErrorMessage: "Failed to power OFF device" },
    });

    return (
        <div className="p-8 flex flex-col gap-8 w-full">
            <PageHeader title="SIMULATION">
                <ChamferButton variant="dark" size="sm" onClick={openLaunchModal}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Launch Simulation</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <SimulationTable
                sessions={sessions}
                loading={loading}
                onPauseSession={(id) => pauseSessionMutation.mutate(id)}
                onResumeSession={(id) => resumeSessionMutation.mutate(id)}
                onStopSession={(id) => stopSessionMutation.mutate(id)}
                onDeleteSession={handleDeleteSession}
                onRefresh={refresh}
            />

            <DeviceHeartbeatTable
                devices={devices}
                loading={devicesLoading}
                onPowerOnDevice={(id) => powerOnMutation.mutateAsync(id)}
                onPowerOffDevice={(id) => powerOffMutation.mutateAsync(id)}
            />

            <AddSimulationModal
                isOpen={isLaunchOpen}
                onClose={closeModal}
                onSubmit={async (payload) => {
                    await createSessionMutation.mutateAsync(payload);
                }}
            />
        </div>
    );
}
