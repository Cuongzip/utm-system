import { clearFieldError } from "./clearFieldError";

export function createFieldErrorCleaner(
    setFieldErrors: (updater: (prev: Record<string, string>) => Record<string, string>) => void
) {
    return (...fields: string[]) => clearFieldError(setFieldErrors, ...fields);
}
