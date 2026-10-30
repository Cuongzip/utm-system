"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { flightService } from "@/services/flightService";
import { FlightEditor } from "@/components/flights";
import { AlertBanner, OutlineButton, PageHeader } from "@/components/ui";
import type { UpdateFlightPayload } from "@/types";

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
        refetch,
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

    const authorizeMutation = useMutation({
        mutationFn: () => flightService.authorizeFlight(flightId),
        onSuccess: () => {
            toast.success("Flight authorized by ATC");
            invalidateAll();
            refetch();
        },
        meta: { defaultErrorMessage: "Failed to authorize flight" },
    });

    const startMutation = useMutation({
        mutationFn: async () => {
            const status = (flight?.status || "planned").toLowerCase();
            const authStatus = ((flight as any)?.authorizationStatus || "").toLowerCase();
            if (status !== "authorized" && authStatus !== "approved") {
                await flightService.authorizeFlight(flightId);
            }
            return flightService.startFlight(flightId);
        },
        onSuccess: () => {
            toast.success("Flight started successfully");
            invalidateAll();
            refetch();
        },
        meta: { defaultErrorMessage: "Failed to start flight" },
    });

    const completeMutation = useMutation({
        mutationFn: () => flightService.completeFlight(flightId),
        onSuccess: () => {
            toast.success("Flight completed successfully");
            invalidateAll();
            refetch();
        },
        meta: { defaultErrorMessage: "Failed to complete flight" },
    });

    const abortMutation = useMutation({
        mutationFn: () => flightService.abortFlight(flightId),
        onSuccess: () => {
            toast.success("Flight aborted");
            invalidateAll();
            refetch();
        },
        meta: { defaultErrorMessage: "Failed to abort flight" },
    });

    const handleSave = async (payload: unknown) => {
        await updateMutation.mutateAsync(payload as UpdateFlightPayload);
    };

    const handleAuthorize = async () => {
        await authorizeMutation.mutateAsync();
    };

    const handleStart = async () => {
        await startMutation.mutateAsync();
    };

    const handleComplete = async () => {
        await completeMutation.mutateAsync();
    };

    const handleAbort = async () => {
        await abortMutation.mutateAsync();
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
            <div className="p-8 flex flex-col gap-6 max-w-4xl mx-auto">
                <PageHeader title="FLIGHT PLAN NOT FOUND">
                    <OutlineButton size="sm" onClick={() => router.push("/dashboard/flights")}>
                        Back to Flights
                    </OutlineButton>
                </PageHeader>
                <AlertBanner
                    message={
                        flightError instanceof Error
                            ? flightError.message
                            : "Could not find the requested flight operation."
                    }
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
            onAuthorize={handleAuthorize}
            onStart={handleStart}
            onComplete={handleComplete}
            onAbort={handleAbort}
            loading={
                updateMutation.isPending ||
                authorizeMutation.isPending ||
                startMutation.isPending ||
                completeMutation.isPending ||
                abortMutation.isPending
            }
        />
    );
}
