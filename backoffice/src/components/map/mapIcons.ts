export function createSvgDataUri(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getDroneIconUri(
    color: string = "#10b981",
    outlineColor: string = "#ffffff"
): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
  <circle cx="18" cy="18" r="17" fill="#0f172a" fill-opacity="0.85" stroke="${outlineColor}" stroke-width="1.5"/>
  <circle cx="9" cy="9" r="4.5" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5"/>
  <circle cx="27" cy="9" r="4.5" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5"/>
  <circle cx="9" cy="27" r="4.5" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5"/>
  <circle cx="27" cy="27" r="4.5" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5"/>
  <line x1="12" y1="12" x2="24" y2="24" stroke="${color}" stroke-width="2"/>
  <line x1="24" y1="12" x2="12" y2="24" stroke="${color}" stroke-width="2"/>
  <rect x="14" y="14" width="8" height="8" rx="2" fill="${color}" stroke="${outlineColor}" stroke-width="1.2"/>
  <polygon points="18,4 21,8 15,8" fill="${outlineColor}"/>
</svg>`;
    return createSvgDataUri(svg);
}

export function getHubIconUri(color: string = "#06b6d4", isSelected: boolean = false): string {
    const stroke = isSelected ? "#00e5ff" : color;
    const bg = isSelected ? "#002b3d" : "#0f172a";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
  <polygon points="17,2 29,7 32,17 29,27 17,32 5,27 2,17 5,7" fill="${bg}" fill-opacity="0.9" stroke="${stroke}" stroke-width="${isSelected ? 2.5 : 1.8}"/>
  <circle cx="17" cy="17" r="10" stroke="${stroke}" stroke-width="1.4" stroke-dasharray="3 2"/>
  <text x="17" y="21.5" font-family="monospace, sans-serif" font-weight="900" font-size="12" fill="${stroke}" text-anchor="middle">H</text>
</svg>`;
    return createSvgDataUri(svg);
}

export function getWaypointIconUri(index: number, isSelected: boolean = false): string {
    const color = isSelected ? "#00e5ff" : "#38bdf8";
    const bg = isSelected ? "#003248" : "#0f172a";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
  <polygon points="13,2 24,13 13,24 2,13" fill="${bg}" fill-opacity="0.9" stroke="${color}" stroke-width="${isSelected ? 2.2 : 1.5}"/>
  <text x="13" y="16.5" font-family="monospace, sans-serif" font-weight="bold" font-size="10" fill="${color}" text-anchor="middle">${index}</text>
</svg>`;
    return createSvgDataUri(svg);
}
