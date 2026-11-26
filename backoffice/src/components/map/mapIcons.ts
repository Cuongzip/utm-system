const iconUriCache = new Map<string, string>();

function getCachedSvgDataUri(cacheKey: string, buildSvg: () => string): string {
    const cached = iconUriCache.get(cacheKey);
    if (cached) return cached;
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildSvg())}`;
    iconUriCache.set(cacheKey, uri);
    return uri;
}

export function getDroneIconUri(
    color: string = "#10b981",
    outlineColor: string = "#38bdf8"
): string {
    const ringColor = outlineColor === "#ffffff" ? "#38bdf8" : outlineColor;
    const key = `drone:${color}:${ringColor}`;
    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" fill="none">
  <line x1="19" y1="1" x2="19" y2="8" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="19" cy="19" r="14.5" fill="#071328" stroke="${ringColor}" stroke-width="2"/>
  <polygon points="19,9 26.5,25 19,21 11.5,25" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="19" cy="19" r="2.2" fill="#071328"/>
</svg>`
    );
}

export function getHubIconUri(color: string = "#00e5ff", isSelected: boolean = false): string {
    const reticleColor = isSelected ? "#00e5ff" : color || "#00e5ff";
    const borderColor = isSelected ? "#00e5ff" : "#ffffff";
    const bg = isSelected ? "#051829" : "#071328";
    const strokeWidth = isSelected ? 2.5 : 2;
    const key = `hub:${reticleColor}:${isSelected ? "1" : "0"}`;

    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
  <rect x="2" y="2" width="30" height="30" rx="7" fill="${bg}" stroke="${borderColor}" stroke-width="${strokeWidth}"/>
  <path d="M 8 13 L 8 8 L 13 8" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 21 8 L 26 8 L 26 13" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 8 21 L 8 26 L 13 26" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 21 26 L 26 26 L 26 21" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="17" y="22.5" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#ffffff" text-anchor="middle">H</text>
</svg>`
    );
}

export function getWaypointIconUri(index: number, isSelected: boolean = false): string {
    const color = isSelected ? "#00e5ff" : "#38bdf8";
    const bg = isSelected ? "#051829" : "#071328";
    const key = `wp:${index}:${isSelected ? "1" : "0"}`;

    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
  <polygon points="13,2 24,13 13,24 2,13" fill="${bg}" fill-opacity="0.95" stroke="${color}" stroke-width="${isSelected ? 2.2 : 1.6}"/>
  <text x="13" y="16.5" font-family="monospace, sans-serif" font-weight="bold" font-size="10" fill="${color}" text-anchor="middle">${index}</text>
</svg>`
    );
}

export function getAircraftIconUri(color: string = "#f59e0b"): string {
    const key = `aircraft:${color}`;
    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none">
  <circle cx="16" cy="16" r="13" fill="#0f172a" fill-opacity="0.88" stroke="${color}" stroke-width="1.8"/>
  <path d="M16 6 L18 13 L25 16 L25 18 L18 17 L17.5 22 L20.5 24 L20.5 25.5 L16 24.5 L11.5 25.5 L11.5 24 L14.5 22 L14 17 L7 18 L7 16 L14 13 Z" fill="${color}"/>
</svg>`
    );
}

export function getConflictMarkerUri(): string {
    return getCachedSvgDataUri(
        "conflict:default",
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
  <polygon points="17,2 32,17 17,32 2,17" fill="#7f1d1d" fill-opacity="0.92" stroke="#ef4444" stroke-width="2.2"/>
  <text x="17" y="22" font-family="system-ui, sans-serif" font-weight="900" font-size="15" fill="#ffffff" text-anchor="middle">!</text>
</svg>`
    );
}
