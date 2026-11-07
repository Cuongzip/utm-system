"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
    ChamferButton,
    PageHeader,
    AlertBanner,
    TableFilterBar,
    type SelectOption,
} from "@/components/ui";
import { HubsTable, AddHubModal, HubsMap } from "@/components/hubs";
import { hubService } from "@/services/hubService";
import { useCrudList, QUERY_KEYS } from "@/hooks";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { HUB_STATUSES, type Hub, type CreateHubPayload, type UpdateHubPayload } from "@/types";

const STATUS_OPTIONS: SelectOption[] = [
    { value: "all", label: "All Statuses" },
    ...HUB_STATUSES.map((status) => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
    })),
];

export default function HubsPage() {
    const queryClient = useQueryClient();
    const fetchHubs = useCallback(() => hubService.getHubs({ limit: 0 }), []);
    const deleteHub = useCallback((id: string) => hubService.deleteHub(id), []);

    const {
        items: hubs,
        loading,
        error,
        setError,
        isModalOpen,
        itemToEdit: selectedHub,
        openCreateModal,
        openEditModal,
        closeModal,
        highlightedId: highlightedHubId,
        handleSelect: handleSelectHub,
        handleDelete: handleDeleteHub,
    } = useCrudList<Hub>({
        queryKey: QUERY_KEYS.hubs,
        fetchFn: fetchHubs,
        deleteFn: deleteHub,
        entityName: "Vertiport hub",
    });

    const saveHubMutation = useMutation({
        mutationFn: async ({
            payload,
            id,
        }: {
            payload: CreateHubPayload | UpdateHubPayload;
            id?: string;
        }) => {
            if (id) {
                return hubService.updateHub(id, payload as UpdateHubPayload);
            }
            return hubService.createHub(payload as CreateHubPayload);
        },
        onSuccess: (_data, variables) => {
            toast.success(
                variables.id
                    ? "Vertiport hub updated successfully"
                    : "Vertiport hub created successfully"
            );
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubs });
        },
        meta: { defaultErrorMessage: "Failed to save hub" },
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredHubs = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return hubs.filter((h) => {
            const matchesSearch =
                !query ||
                (h.name || "").toLowerCase().includes(query) ||
                (h.code || "").toLowerCase().includes(query);

            const matchesStatus = status === "all" || (h.status || "").toLowerCase() === status;

            return matchesSearch && matchesStatus;
        });
    }, [hubs, searchQuery, statusFilter]);

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="HUBS">
                <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Add Hub</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search hubs..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
            />

            <div className="flex flex-col gap-6 w-full">
                <HubsTable
                    hubs={filteredHubs}
                    loading={loading}
                    selectedHubId={highlightedHubId}
                    onSelectHub={handleSelectHub}
                    onEditHub={openEditModal}
                    onDeleteHub={handleDeleteHub}
                />

                <div className="w-full h-[560px]">
                    <HubsMap
                        hubs={filteredHubs}
                        selectedHubId={highlightedHubId}
                        onSelectHub={handleSelectHub}
                    />
                </div>
            </div>

            <AddHubModal
                isOpen={isModalOpen}
                hubToEdit={selectedHub}
                onClose={closeModal}
                onSubmit={(payload, id) => saveHubMutation.mutateAsync({ payload, id })}
            />
        </div>
    );
}
