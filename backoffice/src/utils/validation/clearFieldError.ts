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
