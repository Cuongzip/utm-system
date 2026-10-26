"use client";

import { useCallback } from "react";
import { ChamferButton, PageHeader, AlertBanner } from "@/components/ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DronesTable, RegisterDroneModal } from "@/components/drones";
import { droneService } from "@/services/droneService";
import { useCrudList, QUERY_KEYS } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Drone, DroneRegistrationPayload } from "@/types";

export default function DronesPage() {
    const fetchDrones = useCallback(() => droneService.getDrones(), []);
    const deleteDrone = useCallback((id: string) => droneService.deleteDrone(id), []);

    const {
        items: drones,
        loading,
        error,
        setError,
        refresh,
        isModalOpen: isRegisterOpen,
        itemToEdit: selectedDrone,
        openCreateModal,
        openEditModal,
        closeModal,
        handleDelete: handleDeleteDrone,
    } = useCrudList<Drone>({
        queryKey: QUERY_KEYS.drones,
        fetchFn: fetchDrones,
        deleteFn: deleteDrone,
        entityName: "Drone",
    });

    const saveDroneMutation = useMutation({
        mutationFn: async ({ payload, id }: { payload: DroneRegistrationPayload; id?: string }) => {
            if (id) {
                return droneService.updateDrone(id, payload);
            }
            return droneService.createDrone(payload);
        },
        onSuccess: (_data, variables) => {
            toast.success(
                variables.id ? "Drone updated successfully" : "Drone registered successfully"
            );
            refresh();
        },
        meta: { defaultErrorMessage: "Failed to save drone" },
    });

    const handleSaveDrone = async (payload: DroneRegistrationPayload, id?: string) => {
        await saveDroneMutation.mutateAsync({ payload, id });
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="DRONES">
                <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Register Drone</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <DronesTable
                drones={drones}
                loading={loading}
                onEditDrone={openEditModal}
                onDeleteDrone={handleDeleteDrone}
            />

            <RegisterDroneModal
                isOpen={isRegisterOpen}
                droneToEdit={selectedDrone}
                onClose={closeModal}
                onSubmit={handleSaveDrone}
            />
        </div>
    );
}
