import { MISSION_SCHEDULE_TYPE } from "@/types";

export function formatMissionSchedule(scheduleType?: string | null): string {
    return scheduleType === MISSION_SCHEDULE_TYPE.SCHEDULED ? "Scheduled" : "Immediate";
}
