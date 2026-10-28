"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHubsAll, useDronesAll } from "@/hooks";
import { missionService } from "@/services/missionService";
import { createMissionWaypoints, MissionEditor, type MissionSaveData } from "@/components/missions";
import type { CreateMissionPayload } from "@/types";

export default function NewMissionPage() {
    const router = useRouter();

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
                } catch {
                    // Non-fatal if mission execution schedule fails
                }
            }

            return created;
        },
        onSuccess: () => {
            toast.success("Mission created successfully");
            router.push("/dashboard/missions");
        },
        meta: { defaultErrorMessage: "Failed to create mission" },
    });

    const handleSave = async (data: MissionSaveData) => {
        await createMutation.mutateAsync(data);
    };

    return (
        <MissionEditor
            mode="create"
            hubs={hubs}
            drones={drones}
            onSave={handleSave}
            loading={hubsLoading || dronesLoading || createMutation.isPending}
        />
    );
}
