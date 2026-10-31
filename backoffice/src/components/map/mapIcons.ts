export function createSvgDataUri(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getDroneIconUri(
    color: string = "#10b981",
    outlineColor: string = "#38bdf8"
): string {
    const ringColor = outlineColor === "#ffffff" ? "#38bdf8" : outlineColor;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38" fill="none">
  <line x1="19" y1="1" x2="19" y2="8" stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="19" cy="19" r="14.5" fill="#071328" stroke="${ringColor}" stroke-width="2"/>
  <polygon points="19,9 26.5,25 19,21 11.5,25" fill="${color}" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
  <circle cx="19" cy="19" r="2.2" fill="#071328"/>
</svg>`;
    return createSvgDataUri(svg);
}

export function getHubIconUri(color: string = "#00e5ff", isSelected: boolean = false): string {
    const reticleColor = isSelected ? "#00e5ff" : color || "#00e5ff";
    const borderColor = isSelected ? "#00e5ff" : "#ffffff";
    const bg = isSelected ? "#051829" : "#071328";
    const strokeWidth = isSelected ? 2.5 : 2;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
  <rect x="2" y="2" width="30" height="30" rx="7" fill="${bg}" stroke="${borderColor}" stroke-width="${strokeWidth}"/>
  <path d="M 8 13 L 8 8 L 13 8" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 21 8 L 26 8 L 26 13" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 8 21 L 8 26 L 13 26" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 21 26 L 26 26 L 26 21" stroke="${reticleColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="17" y="22.5" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="15" fill="#ffffff" text-anchor="middle">H</text>
</svg>`;
    return createSvgDataUri(svg);
}

export function getWaypointIconUri(index: number, isSelected: boolean = false): string {
    const color = isSelected ? "#00e5ff" : "#38bdf8";
    const bg = isSelected ? "#051829" : "#071328";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
  <polygon points="13,2 24,13 13,24 2,13" fill="${bg}" fill-opacity="0.95" stroke="${color}" stroke-width="${isSelected ? 2.2 : 1.6}"/>
  <text x="13" y="16.5" font-family="monospace, sans-serif" font-weight="bold" font-size="10" fill="${color}" text-anchor="middle">${index}</text>
</svg>`;
    return createSvgDataUri(svg);
}
