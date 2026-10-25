"use client";

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, PageHeader, AlertBanner } from "@/components/ui";
import { HubsTable, AddHubModal, HubsMap } from "@/components/hubs";
import { hubService } from "@/services/hubService";
import { useCrudList } from "@/hooks";
import type { Hub, CreateHubPayload, UpdateHubPayload } from "@/types";

export default function HubsPage() {
    const fetchHubs = useCallback(() => hubService.getHubs({ limit: 0 }), []);
    const deleteHub = useCallback((id: string) => hubService.deleteHub(id), []);

    const {
        items: hubs,
        loading,
        error,
        setError,
        refresh,
        isModalOpen,
        itemToEdit: selectedHub,
        openCreateModal,
        openEditModal,
        closeModal,
        highlightedId: highlightedHubId,
        handleSelect: handleSelectHub,
        handleDelete: handleDeleteHub,
    } = useCrudList<Hub>({
        fetchFn: fetchHubs,
        deleteFn: deleteHub,
        entityName: "Vertiport hub",
    });

    const handleSaveHub = async (payload: CreateHubPayload | UpdateHubPayload, id?: string) => {
        try {
            if (id) {
                await hubService.updateHub(id, payload as UpdateHubPayload);
                toast.success("Vertiport hub updated successfully");
            } else {
                await hubService.createHub(payload as CreateHubPayload);
                toast.success("Vertiport hub created successfully");
            }
            await refresh();
        } catch (err: unknown) {
            toast.error("Failed to save hub");
            throw err;
        }
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="HUBS">
                <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
                    <Plus className="w-4 h-4 text-white" />
                    <span>Add Hub</span>
                </ChamferButton>
            </PageHeader>

            {error && <AlertBanner message={error} onDismiss={() => setError(null)} />}

            <div className="flex flex-col gap-6 w-full">
                <HubsTable
                    hubs={hubs}
                    loading={loading}
                    selectedHubId={highlightedHubId}
                    onSelectHub={handleSelectHub}
                    onEditHub={openEditModal}
                    onDeleteHub={handleDeleteHub}
                />

                <div className="w-full h-[560px]">
                    <HubsMap
                        hubs={hubs}
                        selectedHubId={highlightedHubId}
                        onSelectHub={handleSelectHub}
                    />
                </div>
            </div>

            <AddHubModal
                isOpen={isModalOpen}
                hubToEdit={selectedHub}
                onClose={closeModal}
                onSubmit={handleSaveHub}
            />
        </div>
    );
}
