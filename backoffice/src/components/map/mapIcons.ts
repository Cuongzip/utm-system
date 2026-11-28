const iconUriCache = new Map<string, string>();

export type DroneIconVariant = "live" | "selected" | "alert" | "replay" | "ghost";
export type HubIconRole = "default" | "departure" | "arrival" | "stop" | "draft";
export type ConflictMarkerSeverity = "high" | "medium";

export interface DroneIconOptions {
    variant?: DroneIconVariant;
}

function getCachedSvgDataUri(cacheKey: string, buildSvg: () => string): string {
    const cached = iconUriCache.get(cacheKey);
    if (cached) return cached;
    const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildSvg())}`;
    iconUriCache.set(cacheKey, uri);
    return uri;
}

export function getDroneIconUri(
    color: string = "#10b981",
    outlineColor: string = "#ffffff",
    options?: DroneIconOptions
): string {
    const variant: DroneIconVariant = options?.variant ?? "live";
    const isGhost = variant === "ghost";
    const isSelected = variant === "selected";
    const isAlert = variant === "alert";
    const isReplay = variant === "replay";
    const ringColor = isSelected
        ? outlineColor || "#00e5ff"
        : isReplay
          ? "#fbbf24"
          : outlineColor || "#ffffff";
    const key = `drone:v3:${color}:${ringColor}:${variant}`;

    return getCachedSvgDataUri(key, () => {
        const bodyOpacity = isGhost ? "0.68" : "1";
        const bodyStrokeDash = isGhost ? ' stroke-dasharray="4 3"' : "";
        const rotorArcDash = isGhost ? "9 28.7" : "15 22.7";
        const highlightHex = isAlert
            ? "#fecaca"
            : isReplay
              ? "#fef08a"
              : isSelected
                ? "#cffafe"
                : "#a7f3d0";

        const lockReticle =
            isSelected || isReplay
                ? `<g opacity="0.96">
    <path d="M66.2 9.0 A43 43 0 0 1 87.0 29.8 M87.0 66.2 A43 43 0 0 1 66.2 87.0 M29.8 87.0 A43 43 0 0 1 9.0 66.2 M9.0 29.8 A43 43 0 0 1 29.8 9.0" stroke="#020617" stroke-opacity="0.72" stroke-width="5.2" stroke-linecap="round"/>
    <path d="M66.2 9.0 A43 43 0 0 1 87.0 29.8 M87.0 66.2 A43 43 0 0 1 66.2 87.0 M29.8 87.0 A43 43 0 0 1 9.0 66.2 M9.0 29.8 A43 43 0 0 1 29.8 9.0" stroke="${ringColor}" stroke-width="2.6" stroke-linecap="round"/>
  </g>`
                : "";

        const alertBeacon = isAlert
            ? `<g>
    <circle cx="48" cy="48" r="43" stroke="#020617" stroke-opacity="0.68" stroke-width="5.2"/>
    <circle cx="48" cy="48" r="43" stroke="#ef4444" stroke-width="2.8" stroke-dasharray="10 5"/>
    <circle cx="48" cy="48" r="36.5" stroke="#fca5a5" stroke-opacity="0.55" stroke-width="1.6"/>
  </g>`
            : "";

        const rotor = (cx: number, cy: number, front: boolean) => `<g>
    <circle cx="${cx}" cy="${cy}" r="13.5" fill="#020617" fill-opacity="${isGhost ? "0.22" : "0.42"}"/>
    <circle cx="${cx}" cy="${cy}" r="12" fill="${color}" fill-opacity="${isGhost ? "0.1" : "0.18"}" stroke="${color}" stroke-opacity="${isGhost ? "0.45" : "0.7"}" stroke-width="1.6"/>
    <circle cx="${cx}" cy="${cy}" r="12" stroke="#ffffff" stroke-opacity="${isGhost ? "0.5" : "0.92"}" stroke-width="2.4" stroke-dasharray="${rotorArcDash}" stroke-linecap="round"/>
    <circle cx="${cx}" cy="${cy}" r="4.1" fill="#0f172a" stroke="#020617" stroke-width="1.4"/>
    <circle cx="${cx}" cy="${cy}" r="2.1" fill="${front ? highlightHex : "#e2e8f0"}"/>
  </g>`;

        return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <defs>
    <radialGradient id="dShadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#020617" stop-opacity="${isGhost ? "0.25" : "0.62"}"/>
      <stop offset="68%" stop-color="#020617" stop-opacity="${isGhost ? "0.1" : "0.32"}"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="dHull" x1="48" y1="18" x2="48" y2="70" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${highlightHex}"/>
      <stop offset="38%" stop-color="${color}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <circle cx="48" cy="48" r="41" fill="url(#dShadow)"/>
  ${alertBeacon}
  ${lockReticle}
  <g opacity="${bodyOpacity}">
    <path d="M48 45 L24 27 M48 45 L72 27 M48 53 L26 70 M48 53 L70 70" stroke="#020617" stroke-width="8.5" stroke-linecap="round"/>
    <path d="M48 45 L24 27 M48 45 L72 27 M48 53 L26 70 M48 53 L70 70" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
    <path d="M48 45 L24 27 M48 45 L72 27" stroke="${color}" stroke-opacity="0.82" stroke-width="1.8" stroke-linecap="round"/>
    ${rotor(24, 27, true)}
    ${rotor(72, 27, true)}
    ${rotor(26, 70, false)}
    ${rotor(70, 70, false)}
    <polygon points="48,5.5 55,15.5 48,12.5 41,15.5" fill="${color}" stroke="#020617" stroke-width="2.2" stroke-linejoin="round"/>
    <polygon points="48,8.5 51.5,13.5 48,12 44.5,13.5" fill="#ffffff" fill-opacity="0.9"/>
    <path d="M48 18 L58.5 36.5 L55.5 59.5 L48 69.5 L40.5 59.5 L37.5 36.5 Z" fill="#020617" stroke="#020617" stroke-width="5.2" stroke-linejoin="round"/>
    <path d="M48 18 L58.5 36.5 L55.5 59.5 L48 69.5 L40.5 59.5 L37.5 36.5 Z" fill="url(#dHull)" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"${bodyStrokeDash}/>
    <path d="M48 24.5 L53.5 37 L48 34 L42.5 37 Z" fill="#ffffff" fill-opacity="0.94"/>
    <circle cx="48" cy="48.5" r="3.4" fill="#071328" stroke="${highlightHex}" stroke-width="1.6"/>
  </g>
</svg>`;
    });
}

export function getHubIconUri(
    color: string = "#06b6d4",
    isSelected: boolean = false,
    role: HubIconRole = "default"
): string {
    const accent = color || "#06b6d4";
    const isDraft = role === "draft";
    const borderColor = isSelected ? "#00e5ff" : isDraft ? "#ffffff" : accent;
    const key = `hub:v3:${accent}:${isSelected ? "1" : "0"}:${role}`;

    return getCachedSvgDataUri(key, () => {
        const dashAttr = isDraft ? ' stroke-dasharray="8 4.5"' : "";
        const selectedHalo = isSelected
            ? `<polygon points="27,3.5 69,3.5 92.5,27 92.5,69 69,92.5 27,92.5 3.5,69 3.5,27" stroke="#00e5ff" stroke-opacity="0.65" stroke-width="2.8" fill="none"/>`
            : "";

        let roleIndicator = "";
        if (role === "departure") {
            roleIndicator = `<g>
    <rect x="38" y="8" width="20" height="11" rx="5.5" fill="#020617" stroke="#10b981" stroke-width="1.4"/>
    <polygon points="48,10.5 53,16.5 43,16.5" fill="#10b981"/>
  </g>`;
        } else if (role === "arrival") {
            roleIndicator = `<g>
    <rect x="38" y="8" width="20" height="11" rx="5.5" fill="#020617" stroke="#06b6d4" stroke-width="1.4"/>
    <polygon points="48,16.5 53,10.5 43,10.5" fill="#06b6d4"/>
  </g>`;
        } else if (role === "stop") {
            roleIndicator = `<g>
    <rect x="38" y="8" width="20" height="11" rx="5.5" fill="#020617" stroke="#f59e0b" stroke-width="1.4"/>
    <polygon points="48,10 52,13.5 48,17 44,13.5" fill="#f59e0b"/>
  </g>`;
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" fill="none">
  <defs>
    <linearGradient id="hBody" x1="48" y1="11" x2="48" y2="85" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${isSelected ? "#0f2d47" : "#1e293b"}"/>
      <stop offset="52%" stop-color="${isSelected ? "#071b30" : "#0b172a"}"/>
      <stop offset="100%" stop-color="#030712"/>
    </linearGradient>
    <radialGradient id="hPadGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="${isSelected ? "0.34" : "0.24"}"/>
      <stop offset="72%" stop-color="${accent}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${selectedHalo}
  <polygon points="28,7.5 68,7.5 88.5,28 88.5,68 68,88.5 28,88.5 7.5,68 7.5,28" fill="#020617" fill-opacity="0.78"/>
  <polygon points="30,11 66,11 85,30 85,66 66,85 30,85 11,66 11,30" fill="url(#hBody)" stroke="${borderColor}" stroke-width="${isSelected ? 3.8 : 3.1}" stroke-linejoin="round"${dashAttr}/>
  <polygon points="31.8,14.8 64.2,14.8 81.2,31.8 81.2,64.2 64.2,81.2 31.8,81.2 14.8,64.2 14.8,31.8" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1.2" fill="none"/>
  <circle cx="48" cy="48" r="26.5" fill="url(#hPadGlow)"/>
  <circle cx="48" cy="48" r="24.5" stroke="${accent}" stroke-opacity="0.9" stroke-width="2.2"/>
  <path d="M48 18 V23.5 M48 72.5 V78 M18 48 H23.5 M72.5 48 H78" stroke="${accent}" stroke-opacity="0.95" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M36.8 35 H42.8 V45.8 H53.2 V35 H59.2 V63.5 H53.2 V51.8 H42.8 V63.5 H36.8 Z" fill="#020617" fill-opacity="0.55"/>
  <path d="M36.8 33.5 H42.8 V44.3 H53.2 V33.5 H59.2 V62 H53.2 V50.3 H42.8 V62 H36.8 Z" fill="#ffffff"/>
  <circle cx="48" cy="80.5" r="3.1" fill="${accent}" stroke="#020617" stroke-width="1.4"/>
  ${roleIndicator}
</svg>`;
    });
}

export function getWaypointIconUri(index: number, isSelected: boolean = false): string {
    const borderColor = isSelected ? "#00e5ff" : "#38bdf8";
    const bg = isSelected ? "#051d33" : "#071328";
    const textColor = isSelected ? "#00e5ff" : "#ffffff";
    const fontSize = index >= 100 ? 15 : index >= 10 ? 18 : 21;
    const key = `wp:v2:${index}:${isSelected ? "1" : "0"}`;

    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" fill="none">
  <polygon points="17,4 39,4 52,17 52,39 39,52 17,52 4,39 4,17" fill="#020617" fill-opacity="0.72"/>
  <polygon points="18,6.5 38,6.5 49.5,18 49.5,38 38,49.5 18,49.5 6.5,38 6.5,18" fill="${bg}" fill-opacity="0.96" stroke="${borderColor}" stroke-width="${isSelected ? 3.2 : 2.4}" stroke-linejoin="round"/>
  <text x="28" y="29" dominant-baseline="central" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-weight="800" font-size="${fontSize}" fill="${textColor}" text-anchor="middle">${index}</text>
</svg>`
    );
}

export function getAircraftIconUri(color: string = "#f59e0b"): string {
    const key = `aircraft:v2:${color}`;
    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68" viewBox="0 0 68 68" fill="none">
  <circle cx="34" cy="34" r="29" fill="#020617" fill-opacity="0.65"/>
  <circle cx="34" cy="34" r="26.5" fill="#0b1220" fill-opacity="0.9" stroke="${color}" stroke-width="2.4"/>
  <path d="M34 11 L37.5 23.5 L53 33 L53 37.5 L37.5 34.5 L36.5 46.5 L43.5 51.5 L43.5 54.5 L34 52 L24.5 54.5 L24.5 51.5 L31.5 46.5 L30.5 34.5 L15 37.5 L15 33 L30.5 23.5 Z" fill="${color}" stroke="#020617" stroke-width="1" stroke-linejoin="round"/>
</svg>`
    );
}

export function getConflictMarkerUri(severity: ConflictMarkerSeverity = "high"): string {
    const isHigh = severity === "high";
    const fillBg = isHigh ? "#450a0a" : "#451a03";
    const strokeColor = isHigh ? "#ef4444" : "#f59e0b";
    const haloColor = isHigh ? "#ef4444" : "#f59e0b";
    const key = `conflict:v2:${severity}`;

    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72" fill="none">
  <polygon points="36,2 70,36 36,70 2,36" stroke="${haloColor}" stroke-opacity="0.4" stroke-width="2.5" fill="#020617" fill-opacity="0.5"/>
  <polygon points="36,7.5 64.5,36 36,64.5 7.5,36" fill="${fillBg}" fill-opacity="0.95" stroke="${strokeColor}" stroke-width="3.2" stroke-linejoin="round"/>
  <path d="M33.4 20.5 H38.6 L37.8 40 H34.2 Z" fill="#ffffff"/>
  <circle cx="36" cy="47.5" r="3" fill="#ffffff"/>
</svg>`
    );
}

export function getTargetPinIconUri(color: string = "#f59e0b"): string {
    const key = `target-pin:v1:${color}`;
    return getCachedSvgDataUri(
        key,
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none">
  <circle cx="32" cy="32" r="21" fill="#020617" fill-opacity="0.65"/>
  <circle cx="32" cy="32" r="18" fill="#071328" fill-opacity="0.88" stroke="${color}" stroke-width="2.6"/>
  <path d="M32 5 V15 M32 49 V59 M5 32 H15 M49 32 H59" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="6" fill="${color}" stroke="#ffffff" stroke-width="2"/>
</svg>`
    );
}

export function getIncidentOriginIconUri(): string {
    return getCachedSvgDataUri(
        "incident-origin:v1",
        () => `<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68" viewBox="0 0 68 68" fill="none">
  <circle cx="34" cy="34" r="30" stroke="#ef4444" stroke-opacity="0.45" stroke-width="2.4" stroke-dasharray="6 4"/>
  <polygon points="22,8 46,8 60,22 60,46 46,60 22,60 8,46 8,22" fill="#450a0a" fill-opacity="0.94" stroke="#ef4444" stroke-width="3" stroke-linejoin="round"/>
  <path d="M31.5 19.5 H36.5 L35.8 38.5 H32.2 Z" fill="#ffffff"/>
  <circle cx="34" cy="45.8" r="2.9" fill="#ffffff"/>
</svg>`
    );
}
