"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { flightService } from "@/services/flightService";
import { FlightEditor } from "@/components/flights";
import type { CreateFlightPayload } from "@/types";

export default function NewFlightPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();

    const createMutation = useMutation({
        mutationFn: (payload: CreateFlightPayload) => flightService.createFlight(payload),
        onSuccess: (data) => {
            toast.success(`Flight plan ${data.flightNumber || ""} registered successfully`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            router.push("/dashboard/flights");
        },
        meta: { defaultErrorMessage: "Failed to create flight plan" },
    });

    const handleSave = async (payload: unknown) => {
        await createMutation.mutateAsync(payload as CreateFlightPayload);
    };

    return (
        <FlightEditor
            mode="create"
            hubs={hubs}
            drones={drones}
            onSave={handleSave}
            loading={hubsLoading || dronesLoading || createMutation.isPending}
        />
    );
}
