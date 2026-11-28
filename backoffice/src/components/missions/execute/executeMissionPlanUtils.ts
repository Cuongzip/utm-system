import type { useTranslations } from "next-intl";
import type { AppLocale } from "@/i18n";
import { localizeServerText } from "@/utils";
import type { MissionExecutionPlan, ScoredDroneCandidate } from "@/types";

type MissionTranslator = ReturnType<typeof useTranslations<"missions">>;

export function formatCandidateLabel(
    c: ScoredDroneCandidate,
    t: MissionTranslator,
    locale: AppLocale
): string {
    const name = c.registrationNumber || c.model || c.droneId.slice(0, 8);
    const score =
        c.finalScore != null ? t("executeModal.pts", { score: Math.round(c.finalScore) }) : "";
    const margin =
        c.batteryMarginPct != null
            ? t("executeModal.marginPct", {
                  sign: c.batteryMarginPct >= 0 ? "+" : "",
                  pct: Math.round(c.batteryMarginPct),
              })
            : "";
    const meta = [score, margin].filter(Boolean).join(" · ");
    if (c.eligible === false) {
        const ineligibleText = c.ineligibilityReason
            ? t("executeModal.ineligibleReason", {
                  reason: localizeServerText(c.ineligibilityReason, locale),
              })
            : t("executeModal.ineligible");
        return `${name} (${ineligibleText})`;
    }
    return meta ? `${name} · ${meta}` : name;
}

export function cleanAirspaceWarning(raw: string, t: MissionTranslator, locale: AppLocale): string {
    const withoutPrefix = raw.replace(/^\[[^\]]+\]\s*/, "").trim();
    const colonIdx = withoutPrefix.indexOf(":");
    if (colonIdx > 0) {
        const zoneName = withoutPrefix.slice(0, colonIdx).trim();
        const detail = withoutPrefix.slice(colonIdx + 1).trim();
        if (detail.toLowerCase().includes("intersects")) {
            return t("executeModal.restrictedZone", { zone: zoneName });
        }
        if (detail.toLowerCase().includes("below floor")) {
            const floorVal = detail.match(/\(([^)]+)\)/)?.[1];
            return floorVal
                ? t("executeModal.belowFloorWithVal", { floor: floorVal, zone: zoneName })
                : t("executeModal.belowFloor", { zone: zoneName });
        }
        return localizeServerText(`${zoneName}: ${detail}`, locale);
    }
    return localizeServerText(withoutPrefix, locale);
}

export function detectRangeShortfall(plan?: MissionExecutionPlan | null): boolean {
    if (!plan) return false;
    const warningIndicatesBattery = (plan.warnings ?? []).some((w) => {
        const lower = w.toLowerCase();
        return (
            lower.includes("battery") ||
            lower.includes("autosplitbyrange") ||
            lower.includes("charging") ||
            lower.includes("usable")
        );
    });
    if (warningIndicatesBattery) return true;

    return (plan.legs ?? []).some((leg) => {
        if ((leg.recommendedChargingHubs?.length ?? 0) > 0) return true;
        const candidates = leg.candidateDrones ?? [];
        return (
            candidates.length > 0 &&
            candidates.every(
                (c) =>
                    c.eligible === false &&
                    (c.batteryMarginPct != null ? c.batteryMarginPct < 0 : true)
            )
        );
    });
}
