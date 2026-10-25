"use client";

import { useCallback } from "react";
import { ChamferButton, PageHeader, AlertBanner } from "@/components/ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DronesTable, RegisterDroneModal } from "@/components/drones";
import { droneService } from "@/services/droneService";
import { useCrudList } from "@/hooks";
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
        fetchFn: fetchDrones,
        deleteFn: deleteDrone,
        entityName: "Drone",
    });

    const handleSaveDrone = async (payload: DroneRegistrationPayload, id?: string) => {
        try {
            if (id) {
                await droneService.updateDrone(id, payload);
                toast.success("Drone updated successfully");
            } else {
                await droneService.createDrone(payload);
                toast.success("Drone registered successfully");
            }
            await refresh();
        } catch (err: unknown) {
            toast.error("Failed to save drone");
            throw err;
        }
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
