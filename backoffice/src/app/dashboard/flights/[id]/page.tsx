"use client";

import { Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useDronesAll, useFlightDetail, QUERY_KEYS } from "@/hooks";
import { flightService } from "@/services/flightService";
import { FlightEditor, FlightReplayDossier } from "@/components/flights";
import { EmptyState, PageEditorSkeleton } from "@/components/ui";
import { FLIGHT_STATUS, type CreateFlightPayload, type UpdateFlightPayload } from "@/types";

function FlightDetailWorkspaceContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const t = useTranslations("flights");
    const params = useParams();
    const queryClient = useQueryClient();
    const flightId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);
    const tabParam = searchParams.get("tab");

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();

    const {
        data: flight,
        isLoading: flightLoading,
        error: flightError,
    } = useFlightDetail(flightId, 5000);

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateFlightPayload) => flightService.updateFlight(flightId, payload),
        onSuccess: () => {
            toast.success(t("toasts.updated"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flightId) });
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

    const isPostFlight =
        flight.status === FLIGHT_STATUS.COMPLETED ||
        flight.status === FLIGHT_STATUS.EMERGENCY_LANDING ||
        flight.status === FLIGHT_STATUS.CANCELLED;

    if (isPostFlight && tabParam !== "plan") {
        return (
            <FlightReplayDossier
                flight={flight}
                hubs={hubs}
                drones={drones}
                onViewPlan={() => router.replace(`/dashboard/flights/${flightId}?tab=plan`)}
            />
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
            onBackToReplay={
                isPostFlight ? () => router.replace(`/dashboard/flights/${flightId}`) : undefined
            }
        />
    );
}

export default function EditFlightPage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <FlightDetailWorkspaceContent />
        </Suspense>
    );
}
