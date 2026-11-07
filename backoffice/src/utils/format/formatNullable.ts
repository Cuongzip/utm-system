export function formatNullable<T>(
    val: T | null | undefined,
    formatter?: (val: T) => string,
    fallback = "—"
): string {
    if (val === null || val === undefined || val === "") return fallback;
    return formatter ? formatter(val) : String(val);
}
