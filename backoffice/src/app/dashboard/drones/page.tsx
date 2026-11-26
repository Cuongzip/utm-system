"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import {
    ChamferButton,
    PageHeader,
    TableFilterBar,
    ErrorState,
    type SelectOption,
} from "@/components/ui";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { DronesTable, AddDroneModal } from "@/components/drones";
import { droneService } from "@/services/droneService";
import { useCrudList, usePermissions, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStatusOptions, compareCreatedDesc } from "@/utils";
import {
    DRONE_STATUSES,
    type Drone,
    type CreateDronePayload,
    type UpdateDronePayload,
} from "@/types";

const STATUS_OPTIONS: SelectOption[] = createStatusOptions(DRONE_STATUSES);

export default function DronesPage() {
    const queryClient = useQueryClient();
    const { canCreateDrone, canEditDrone, canDeleteDrone } = usePermissions();
    const fetchDrones = useCallback(() => droneService.getDrones(), []);
    const deleteDrone = useCallback((id: string) => droneService.deleteDrone(id), []);

    const {
        items: drones,
        loading,
        isError,
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
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.drones });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dronesAll });
        },
        meta: { defaultErrorMessage: "Failed to save drone" },
    });

    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearch = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState("all");

    const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("all");
    }, []);

    const filteredDrones = useMemo(() => {
        const query = deferredSearch.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return [...drones]
            .filter((d) => {
                const matchesSearch =
                    !query ||
                    (d.registrationNumber || "").toLowerCase().includes(query) ||
                    (d.model || "").toLowerCase().includes(query) ||
                    (d.manufacturer || "").toLowerCase().includes(query) ||
                    (d.owner?.name || "").toLowerCase().includes(query) ||
                    (d.homeHub?.name || "").toLowerCase().includes(query);

                const matchesStatus = status === "all" || (d.status || "").toLowerCase() === status;

                return matchesSearch && matchesStatus;
            })
            .sort(compareCreatedDesc);
    }, [drones, deferredSearch, statusFilter]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title="DRONES">
                {canCreateDrone && (
                    <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
                        <Plus className="w-4 h-4 text-white" />
                        <span>Register Drone</span>
                    </ChamferButton>
                )}
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search registration, model, or hub..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
                onClearFilters={clearFilters}
                totalCount={drones.length}
                filteredCount={filteredDrones.length}
            />

            {isError && drones.length === 0 ? (
                <ErrorState
                    title="Unable to load drone fleet"
                    description="The Drone Service could not be reached. Please try again."
                    onRetry={refresh}
                />
            ) : (
                <DronesTable
                    drones={filteredDrones}
                    loading={loading}
                    canEdit={canEditDrone}
                    canDelete={canDeleteDrone}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    onEditDrone={openEditModal}
                    onDeleteDrone={handleDeleteDrone}
                />
            )}

            {(canCreateDrone || canEditDrone) && (
                <AddDroneModal
                    isOpen={isRegisterOpen}
                    droneToEdit={selectedDrone}
                    onClose={closeModal}
                    onSubmit={(payload, id) => saveDroneMutation.mutateAsync({ payload, id })}
                />
            )}
        </div>
    );
}
