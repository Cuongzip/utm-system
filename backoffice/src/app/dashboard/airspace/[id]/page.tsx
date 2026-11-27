"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useAirspaceAll, useAirspaceDetail, QUERY_KEYS } from "@/hooks";
import { airspaceService } from "@/services/airspaceService";
import { AirspaceEditor } from "@/components/airspace";
import { EmptyState, PageEditorSkeleton } from "@/components/ui";
import type { UpdateAirspaceZonePayload } from "@/types";

export default function EditAirspacePage() {
    const router = useRouter();
    const params = useParams();
    const t = useTranslations("airspace");
    const queryClient = useQueryClient();
    const zoneId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: zones = [] } = useAirspaceAll();

    const { data: zone, isLoading: zoneLoading, error: zoneError } = useAirspaceDetail(zoneId);

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateAirspaceZonePayload) =>
            airspaceService.updateZone(zoneId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.airspace });
            toast.success(t("updatedToast"));
            router.push("/dashboard/airspace");
        },
        meta: { defaultErrorMessage: t("updateFailed") },
    });

    const deleteMutation = useMutation({
        mutationFn: () => airspaceService.deleteZone(zoneId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.airspace });
            toast.success(t("deactivatedToast"));
            router.push("/dashboard/airspace");
        },
        meta: { defaultErrorMessage: t("deleteFailed") },
    });

    if (zoneLoading || hubsLoading) {
        return <PageEditorSkeleton />;
    }

    if (zoneError || !zone) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <EmptyState
                    icon={AlertCircle}
                    title={t("notFoundTitle")}
                    description={zoneError instanceof Error ? zoneError.message : t("notFoundDesc")}
                    action={{
                        label: t("backToAirspace"),
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
