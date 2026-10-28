"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useHubsAll, useAirspaceAll, QUERY_KEYS } from "@/hooks";
import { airspaceService } from "@/services/airspaceService";
import { AirspaceEditor } from "@/components/airspace";
import { AlertBanner, OutlineButton, PageHeader } from "@/components/ui";
import type { UpdateAirspaceZonePayload } from "@/types";

export default function EditAirspacePage() {
    const router = useRouter();
    const params = useParams();
    const zoneId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: zones = [] } = useAirspaceAll();

    const {
        data: zone,
        isLoading: zoneLoading,
        error: zoneError,
    } = useQuery({
        queryKey: [...QUERY_KEYS.airspace, "detail", zoneId],
        queryFn: () => airspaceService.getZoneById(zoneId),
        enabled: Boolean(zoneId),
    });

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateAirspaceZonePayload) =>
            airspaceService.updateZone(zoneId, payload),
        onSuccess: () => {
            toast.success("Airspace zone updated successfully");
            router.push("/dashboard/airspace");
        },
        meta: { defaultErrorMessage: "Failed to update airspace zone" },
    });

    const deleteMutation = useMutation({
        mutationFn: () => airspaceService.deleteZone(zoneId),
        onSuccess: () => {
            toast.success("Airspace zone deactivated successfully");
            router.push("/dashboard/airspace");
        },
        meta: { defaultErrorMessage: "Failed to delete airspace zone" },
    });

    const handleSave = async (payload: unknown) => {
        await updateMutation.mutateAsync(payload as UpdateAirspaceZonePayload);
    };

    const handleDelete = async () => {
        await deleteMutation.mutateAsync();
    };

    if (zoneLoading || hubsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                <p className="text-xs font-mono text-[var(--color-text-muted)]">
                    Loading airspace zone details...
                </p>
            </div>
        );
    }

    if (zoneError || !zone) {
        return (
            <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
                <PageHeader title="AIRSPACE ZONE NOT FOUND">
                    <OutlineButton size="sm" onClick={() => router.push("/dashboard/airspace")}>
                        Back to Airspace List
                    </OutlineButton>
                </PageHeader>
                <AlertBanner
                    message={
                        zoneError instanceof Error
                            ? zoneError.message
                            : "Could not find the requested airspace zone profile."
                    }
                />
            </div>
        );
    }

    return (
        <AirspaceEditor
            mode="edit"
            initialData={zone}
            hubs={hubs}
            existingZones={zones}
            onSave={handleSave}
            onDelete={handleDelete}
            loading={updateMutation.isPending || deleteMutation.isPending}
        />
    );
}
