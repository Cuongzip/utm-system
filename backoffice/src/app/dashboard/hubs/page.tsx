"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, PageHeader, AlertBanner } from "@/components/ui";
import { HubsTable, AddHubModal, HubsMap } from "@/components/hubs";
import { hubService } from "@/services/hubService";
import type { Hub, CreateHubPayload, UpdateHubPayload } from "@/types";

export default function HubsPage() {
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
    const [highlightedHubId, setHighlightedHubId] = useState<string | null>(null);

    const fetchHubs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await hubService.getHubs({ limit: 0 });
            setHubs(res.items || []);
            setError(null);
        } catch {
            setError("Failed to fetch vertiport hubs");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchHubs();
    }, [fetchHubs]);

    const handleSaveHub = async (payload: CreateHubPayload | UpdateHubPayload, id?: string) => {
        try {
            if (id) {
                await hubService.updateHub(id, payload as UpdateHubPayload);
                toast.success("Vertiport hub updated successfully");
            } else {
                await hubService.createHub(payload as CreateHubPayload);
                toast.success("Vertiport hub created successfully");
            }
            await fetchHubs();
        } catch (err: unknown) {
            toast.error("Failed to save hub");
            throw err;
        }
    };

    const handleDeleteHub = async (id: string) => {
        try {
            await hubService.deleteHub(id);
            if (highlightedHubId === id) {
                setHighlightedHubId(null);
            }
            toast.success("Vertiport hub deleted successfully");
            await fetchHubs();
        } catch {
            toast.error("Failed to delete hub");
            setError("Failed to delete hub");
        }
    };

    const handleEditHub = (hub: Hub) => {
        setSelectedHub(hub);
        setIsModalOpen(true);
    };

    const handleSelectHub = (hub: Hub | null) => {
        setHighlightedHubId(hub ? hub.id : null);
    };

    return (
        <div className="p-8 flex flex-col gap-6 w-full">
            <PageHeader title="HUBS">
                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => {
                        setSelectedHub(null);
                        setIsModalOpen(true);
                    }}
                >
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
                    onEditHub={handleEditHub}
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
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedHub(null);
                }}
                onSubmit={handleSaveHub}
            />
        </div>
    );
}
