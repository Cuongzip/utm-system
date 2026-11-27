"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHubsAll, useAirspaceAll, QUERY_KEYS } from "@/hooks";
import { airspaceService } from "@/services/airspaceService";
import { AirspaceEditor } from "@/components/airspace";
import type { CreateAirspaceZonePayload } from "@/types";

export default function NewAirspacePage() {
    const router = useRouter();
    const t = useTranslations("airspace");
    const queryClient = useQueryClient();

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: zones = [], isLoading: zonesLoading } = useAirspaceAll();

    const createMutation = useMutation({
        mutationFn: (payload: CreateAirspaceZonePayload) => airspaceService.createZone(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.airspace });
            toast.success(t("createdToast"));
            router.push("/dashboard/airspace");
        },
        meta: { defaultErrorMessage: t("createFailed") },
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
