export type ValidationResult<T = unknown> =
    { success: true; data: T } | { success: false; errors: Record<string, string> };

export function validateSchema<T = unknown>(
    schema: { safeParse: (data: unknown) => { success: boolean; data?: any; error?: any } },
    data: unknown
): ValidationResult<T> {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string> = {};
    if (result.error?.issues) {
        for (const issue of result.error.issues) {
            const path = issue.path.join(".");
            if (path && !errors[path]) {
                errors[path] = issue.message;
            }
        }
    }

    return { success: false, errors };
}

export function parseFormNumber(val: string): number | undefined {
    return val.trim() === "" ? undefined : Number(val);
}

export function clearFieldError(
    setFieldErrors: (updater: (prev: Record<string, string>) => Record<string, string>) => void,
    ...fields: string[]
): void {
    setFieldErrors((prev) => {
        const hasAny = fields.some((f) => prev[f]);
        if (!hasAny) return prev;
        const next = { ...prev };
        for (const f of fields) {
            delete next[f];
        }
        return next;
    });
}

export function createFieldErrorCleaner(
    setFieldErrors: (updater: (prev: Record<string, string>) => Record<string, string>) => void
) {
    return (...fields: string[]) => clearFieldError(setFieldErrors, ...fields);
}
