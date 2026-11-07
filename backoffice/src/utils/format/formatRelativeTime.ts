import { formatDistanceToNow } from "date-fns";
import { toValidDate } from "./toValidDate";

export function formatRelativeTime(val?: string | Date | number | null): string {
    const d = toValidDate(val);
    if (!d) return "—";
    try {
        return formatDistanceToNow(d, { addSuffix: true });
    } catch {
        return "—";
    }
}
