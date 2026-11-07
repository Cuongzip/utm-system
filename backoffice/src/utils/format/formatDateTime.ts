import { format } from "date-fns";
import { toValidDate } from "./toValidDate";

export function formatDateTime(
    val?: string | Date | number | null,
    pattern = "MMM dd, yyyy HH:mm:ss"
): string {
    const d = toValidDate(val);
    if (!d) return "--";
    try {
        return format(d, pattern);
    } catch {
        return String(val);
    }
}
