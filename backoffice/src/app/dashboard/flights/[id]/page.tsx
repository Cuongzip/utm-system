"use client";

import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useDronesAll, useFlightDetail, QUERY_KEYS } from "@/hooks";
import { flightService } from "@/services/flightService";
import { FlightEditor } from "@/components/flights";
import { EmptyState, PageEditorSkeleton } from "@/components/ui";
import type { CreateFlightPayload, UpdateFlightPayload } from "@/types";

export default function EditFlightPage() {
    const router = useRouter();
    const t = useTranslations("flights");
    const params = useParams();
    const queryClient = useQueryClient();
    const flightId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();

    const {
        data: flight,
        isLoading: flightLoading,
        error: flightError,
    } = useFlightDetail(flightId);

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateFlightPayload) => flightService.updateFlight(flightId, payload),
        onSuccess: () => {
            toast.success(t("toasts.updated"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            router.push("/dashboard/flights");
        },
        meta: { defaultErrorMessage: t("toasts.updateFailed") },
    });

    const handleSave = async (payload: CreateFlightPayload | UpdateFlightPayload) => {
        await updateMutation.mutateAsync(payload as UpdateFlightPayload);
    };

    if (flightLoading || hubsLoading || dronesLoading) {
        return <PageEditorSkeleton />;
    }

    if (flightError || !flight) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <EmptyState
                    icon={AlertCircle}
                    title={t("notFoundTitle")}
                    description={
                        flightError instanceof Error ? flightError.message : t("notFoundDesc")
                    }
                    action={{
                        label: t("backToFlights"),
                        onClick: () => router.push("/dashboard/flights"),
                        icon: ArrowLeft,
                        variant: "chamfer",
                    }}
                />
            </div>
        );
    }

    return (
        <FlightEditor
            mode="edit"
            initialData={flight}
            hubs={hubs}
            drones={drones}
            onSave={handleSave}
            loading={updateMutation.isPending}
        />
    );
}
