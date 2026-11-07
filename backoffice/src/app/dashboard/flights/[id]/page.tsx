"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { flightService } from "@/services/flightService";
import { FlightEditor } from "@/components/flights";
import { EmptyState } from "@/components/ui";
import type { CreateFlightPayload, UpdateFlightPayload } from "@/types";

export default function EditFlightPage() {
    const router = useRouter();
    const params = useParams();
    const queryClient = useQueryClient();
    const flightId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();

    const {
        data: flight,
        isLoading: flightLoading,
        error: flightError,
    } = useQuery({
        queryKey: [...QUERY_KEYS.flights, "detail", flightId],
        queryFn: () => flightService.getById(flightId),
        enabled: Boolean(flightId),
    });

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
    };

    const updateMutation = useMutation({
        mutationFn: (payload: UpdateFlightPayload) => flightService.updateFlight(flightId, payload),
        onSuccess: () => {
            toast.success("Flight plan updated successfully");
            invalidateAll();
            router.push("/dashboard/flights");
        },
        meta: { defaultErrorMessage: "Failed to update flight plan" },
    });

    const handleSave = async (payload: CreateFlightPayload | UpdateFlightPayload) => {
        await updateMutation.mutateAsync(payload as UpdateFlightPayload);
    };

    if (flightLoading || hubsLoading || dronesLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                <p className="text-xs font-mono text-[var(--color-text-muted)]">
                    Loading flight operation details...
                </p>
            </div>
        );
    }

    if (flightError || !flight) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <EmptyState
                    icon={AlertCircle}
                    title="Flight Plan Not Found"
                    description={
                        flightError instanceof Error
                            ? flightError.message
                            : "The requested flight operation does not exist or may have been removed."
                    }
                    action={{
                        label: "Back to Flights Management",
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
