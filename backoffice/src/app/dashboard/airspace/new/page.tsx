"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHubsAll, useAirspaceAll } from "@/hooks";
import { airspaceService } from "@/services/airspaceService";
import { AirspaceEditor } from "@/components/airspace";
import type { CreateAirspaceZonePayload } from "@/types";

export default function NewAirspacePage() {
    const router = useRouter();

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: zones = [], isLoading: zonesLoading } = useAirspaceAll();

    const createMutation = useMutation({
        mutationFn: (payload: CreateAirspaceZonePayload) => airspaceService.createZone(payload),
        onSuccess: () => {
            toast.success("Airspace zone created successfully");
            router.push("/dashboard/airspace");
        },
        meta: { defaultErrorMessage: "Failed to create airspace zone" },
    });

    return (
        <AirspaceEditor
            mode="create"
            hubs={hubs}
            existingZones={zones}
            onSave={async (p) => {
                await createMutation.mutateAsync(p as CreateAirspaceZonePayload);
            }}
            loading={hubsLoading || zonesLoading || createMutation.isPending}
        />
    );
}
