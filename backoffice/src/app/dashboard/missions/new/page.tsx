"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useHubsAll, useDronesAll, useCurrentUser, QUERY_KEYS } from "@/hooks";
import { missionService } from "@/services/missionService";
import { createMissionWaypoints, MissionEditor, type MissionSaveData } from "@/components/missions";
import { showApiError } from "@/utils";
import type { CreateMissionPayload } from "@/types";

export default function NewMissionPage() {
    const router = useRouter();
    const t = useTranslations("missions");
    const queryClient = useQueryClient();

    const { data: currentUser } = useCurrentUser();
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
                const pilotId = currentUser?.username?.trim() || currentUser?.email?.trim();
                if (!pilotId) {
                    toast.warning(t("toasts.savedDraftNoPilot"));
                } else {
                    try {
                        await missionService.executeMission(savedMissionId, {
                            droneId,
                            pilotId,
                        });
                    } catch (err) {
                        showApiError(err, t("toasts.createdExecFailed"));
                    }
                }
            }

            return created;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.missions });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
            toast.success(t("toasts.created"));
            router.push("/dashboard/missions");
        },
        meta: { defaultErrorMessage: t("toasts.createFailed") },
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
