"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHubsAll, useDronesAll, QUERY_KEYS } from "@/hooks";
import { missionService } from "@/services/missionService";
import { createMissionWaypoints, MissionEditor, type MissionSaveData } from "@/components/missions";
import { showApiError } from "@/utils";
import type { CreateMissionPayload } from "@/types";

export default function NewMissionPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();

    const createMutation = useMutation({
        mutationFn: async ({ payload, waypoints, defaultAltitude, droneId }: MissionSaveData) => {
            const created = await missionService.createMission(payload as CreateMissionPayload);
            const savedMissionId = created.id;

            if (savedMissionId && waypoints.length > 0) {
                await createMissionWaypoints(savedMissionId, waypoints, defaultAltitude);
            }

            if (savedMissionId && droneId) {
                try {
                    await missionService.executeMission(savedMissionId, {
                        droneId,
                        pilotId: "operator",
                    });
                } catch (err) {
                    showApiError(err, "Mission created, but failed to schedule execution");
                }
            }

            return created;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            toast.success("Mission created successfully");
            router.push("/dashboard/missions");
        },
        meta: { defaultErrorMessage: "Failed to create mission" },
    });

    return (
        <MissionEditor
            mode="create"
            hubs={hubs}
            drones={drones}
            onSave={async (data) => {
                await createMutation.mutateAsync(data);
            }}
            loading={hubsLoading || dronesLoading || createMutation.isPending}
        />
    );
}
