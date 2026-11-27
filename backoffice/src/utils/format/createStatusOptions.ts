import type { SelectOption } from "@/components/ui";
import { getCurrentLocale, MESSAGES, translateStatusLabel } from "@/i18n";

export function createStatusOptions<T extends string>(
    statuses: readonly T[],
    labels?: Partial<Record<T, string>>,
    allLabel?: string
): SelectOption[] {
    const locale = getCurrentLocale();
    const resolvedAllLabel = allLabel ?? MESSAGES[locale].common.allStatuses;

    return [
        { value: "all", label: resolvedAllLabel },
        ...statuses.map((status) => ({
            value: status,
            label:
                labels?.[status] ??
                translateStatusLabel(status, locale) ??
                status
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" "),
        })),
    ];
}
