import { getCurrentLocale, MESSAGES } from "@/i18n";
import { MISSION_SCHEDULE_TYPE } from "@/types";

export function formatMissionSchedule(scheduleType?: string | null): string {
    const common = MESSAGES[getCurrentLocale()].common;
    return scheduleType === MISSION_SCHEDULE_TYPE.SCHEDULED ? common.scheduled : common.immediate;
}
