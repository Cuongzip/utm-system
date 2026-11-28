export type EntityLookupSource = ReadonlyMap<string, string> | Record<string, string>;

const UUID_GLOBAL_REGEX = /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi;

function lookupEntityCode(uuid: string, source?: EntityLookupSource): string | undefined {
    if (!source) return undefined;
    const lower = uuid.toLowerCase();
    if (
        source instanceof Map ||
        typeof (source as ReadonlyMap<string, string>).get === "function"
    ) {
        const m = source as ReadonlyMap<string, string>;
        return m.get(uuid) ?? m.get(lower);
    }
    const rec = source as Record<string, string>;
    return rec[uuid] ?? rec[lower];
}

export function resolveEntityReferences(raw: string, entityMap?: EntityLookupSource): string {
    if (!raw) return "";
    return raw.replace(UUID_GLOBAL_REGEX, (uuid, _g1, offset: number, full: string) => {
        const mapped = lookupEntityCode(uuid, entityMap);
        if (mapped) return mapped;

        const prefixSlice = full.slice(Math.max(0, offset - 16), offset).toLowerCase();
        const shortHex = uuid.slice(0, 8).toUpperCase();
        if (/\bhub\s+$/.test(prefixSlice)) return `HUB-${shortHex}`;
        if (/\bflight\s+$/.test(prefixSlice)) return `FLT-${shortHex}`;
        if (/\bdrone\s+$/.test(prefixSlice)) return `DRN-${shortHex}`;
        return shortHex;
    });
}
