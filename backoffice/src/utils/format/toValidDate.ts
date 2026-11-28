export function toValidDate(val?: string | Date | number | null): Date | null {
    if (val == null || val === "") return null;
    const normalized = typeof val === "string" ? val.replace(/\[[^\]]+\]$/, "") : val;
    const d = normalized instanceof Date ? normalized : new Date(normalized);
    return !isNaN(d.getTime()) ? d : null;
}
