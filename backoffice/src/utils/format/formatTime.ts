import { format } from "date-fns";
import { toValidDate } from "./toValidDate";

export function formatTime(val?: string | Date | number | null, pattern = "HH:mm:ss"): string {
    const d = toValidDate(val);
    if (!d) return "--";
    try {
        return format(d, pattern);
    } catch {
        return String(val);
    }
}
