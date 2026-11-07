import { toast } from "sonner";
import { parseApiError, type ParsedApiError } from "./parseApiError";

export function showApiError(
    err: unknown,
    defaultMessage = "An unexpected error occurred"
): ParsedApiError {
    const parsed = parseApiError(err, defaultMessage);
    toast.error(parsed.message);
    return parsed;
}
