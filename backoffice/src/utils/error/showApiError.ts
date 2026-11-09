import { toast } from "sonner";
import { parseApiError, type ParsedApiError } from "./parseApiError";

export function showApiError(
    err: unknown,
    defaultMessage = "An unexpected error occurred"
): ParsedApiError {
    const parsed = parseApiError(err, defaultMessage);

    const hasFieldErrors = Object.keys(parsed.fieldErrors).length > 0;
    if (hasFieldErrors || parsed.errorCode === "VALIDATION_FAILED") {
        return parsed;
    }

    if (parsed.description) {
        toast.error(parsed.cleanMessage, { description: parsed.description });
    } else {
        toast.error(parsed.cleanMessage);
    }
    return parsed;
}
