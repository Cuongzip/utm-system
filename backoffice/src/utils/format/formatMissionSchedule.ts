export function formatMissionSchedule(scheduleType?: string | null): string {
    return scheduleType === "scheduled" ? "Scheduled" : "Immediate";
}
