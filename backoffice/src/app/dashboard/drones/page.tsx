"use client";

import { useState, useCallback, useMemo } from "react";
import { ChamferButton, PageHeader, TableFilterBar, type SelectOption } from "@/components/ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DronesTable, AddDroneModal } from "@/components/drones";
import { droneService } from "@/services/droneService";
import { useCrudList, QUERY_KEYS } from "@/hooks";
import { useMutation } from "@tanstack/react-query";
import {
    DRONE_STATUSES,
    type Drone,
    type CreateDronePayload,
    type UpdateDronePayload,
} from "@/types";

const STATUS_OPTIONS: SelectOption[] = [
    { value: "all", label: "All Statuses" },
    ...DRONE_STATUSES.map((status) => ({
        value: status,
        label: status
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
    })),
];

export default function DronesPage() {
    const fetchDrones = useCallback(() => droneService.getDrones(), []);
    const deleteDrone = useCallback((id: string) => droneService.deleteDrone(id), []);

    const {
        items: drones,
        loading,
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
        mutationFn: ({
            payload,
            id,
        }: {
            payload: CreateDronePayload | UpdateDronePayload;
            id?: string;
        }) =>
            id
                ? droneService.updateDrone(id, payload as UpdateDronePayload)
                : droneService.createDrone(payload as CreateDronePayload),
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
                onSubmit={(payload, id) => saveDroneMutation.mutateAsync({ payload, id })}
            />
        </div>
    );
}
