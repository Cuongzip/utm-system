"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useAirspaceAll, QUERY_KEYS } from "@/hooks";
import { airspaceService } from "@/services/airspaceService";
import { AirspaceEditor } from "@/components/airspace";
import { EmptyState } from "@/components/ui";
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

    if (zoneLoading || hubsLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-[var(--color-border-dark)] animate-spin" />
                <p className="text-xs font-mono text-[var(--color-text-muted)]">
                    Loading airspace zone details...
                </p>
            </div>
        );
    }

    if (zoneError || !zone) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <EmptyState
                    icon={AlertCircle}
                    title="Airspace Zone Not Found"
                    description={
                        zoneError instanceof Error
                            ? zoneError.message
                            : "The requested airspace zone does not exist or may have been removed."
                    }
                    action={{
                        label: "Back to Airspace Management",
                        onClick: () => router.push("/dashboard/airspace"),
                        icon: ArrowLeft,
                        variant: "chamfer",
                    }}
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
            onSave={async (p) => {
                await updateMutation.mutateAsync(p as UpdateAirspaceZonePayload);
            }}
            onDelete={async () => {
                await deleteMutation.mutateAsync();
            }}
            loading={updateMutation.isPending || deleteMutation.isPending}
        />
    );
}
