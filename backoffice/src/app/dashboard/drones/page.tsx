"use client";

import { useState, useCallback, useMemo } from "react";
import {
    ChamferButton,
    PageHeader,
    AlertBanner,
    TableFilterBar,
    type SelectOption,
} from "@/components/ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DronesTable, AddDroneModal } from "@/components/drones";
import { droneService } from "@/services/droneService";
import { useCrudList, QUERY_KEYS } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import type { Drone, DroneRegistrationPayload } from "@/types";

const STATUS_OPTIONS: SelectOption[] = [
    { value: "all", label: "All Statuses" },
    { value: "available", label: "Available" },
    { value: "in_flight", label: "In Flight" },
    { value: "charging", label: "Charging" },
    { value: "maintenance", label: "Maintenance" },
    { value: "offline", label: "Offline" },
];

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

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredDrones = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return drones.filter((d) => {
            const matchesSearch =
                !query ||
                (d.registrationNumber || "").toLowerCase().includes(query) ||
                (d.model || "").toLowerCase().includes(query) ||
                (d.manufacturer || "").toLowerCase().includes(query) ||
                (d.owner?.name || "").toLowerCase().includes(query) ||
                (d.homeHub?.name || "").toLowerCase().includes(query);

            const matchesStatus = status === "all" || (d.status || "").toLowerCase() === status;

            return matchesSearch && matchesStatus;
        });
    }, [drones, searchQuery, statusFilter]);

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="DRONES">
                <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Register Drone</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search drones..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
            />

            <DronesTable
                drones={filteredDrones}
                loading={loading}
                onEditDrone={openEditModal}
                onDeleteDrone={handleDeleteDrone}
            />

            <AddDroneModal
                isOpen={isRegisterOpen}
                droneToEdit={selectedDrone}
                onClose={closeModal}
                onSubmit={async (payload, id) => {
                    await saveDroneMutation.mutateAsync({ payload, id });
                }}
            />
        </div>
    );
}
