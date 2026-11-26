export function compareCreatedDesc(
    a: { createdOn?: string | null },
    b: { createdOn?: string | null }
): number {
    const tA = a.createdOn ? Date.parse(a.createdOn) : 0;
    const tB = b.createdOn ? Date.parse(b.createdOn) : 0;
    return (Number.isNaN(tB) ? 0 : tB) - (Number.isNaN(tA) ? 0 : tA);
}
