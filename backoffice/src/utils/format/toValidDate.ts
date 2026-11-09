export function toValidDate(val?: string | Date | number | null): Date | null {
    if (!val) return null;
    const d = val instanceof Date ? val : new Date(val);
    return !isNaN(d.getTime()) ? d : null;
}
