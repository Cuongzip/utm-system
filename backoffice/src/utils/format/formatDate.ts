import { format } from "date-fns";
import { getDateFnsLocale } from "@/i18n";
import { toValidDate } from "./toValidDate";

export function formatDate(val?: string | Date | number | null, pattern = "MMM dd, yyyy"): string {
    const d = toValidDate(val);
    if (!d) return "—";
    try {
        return format(d, pattern, { locale: getDateFnsLocale() });
    } catch {
        return "—";
    }
}
