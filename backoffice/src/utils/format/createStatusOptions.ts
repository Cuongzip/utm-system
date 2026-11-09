import type { SelectOption } from "@/components/ui";

export function createStatusOptions<T extends string>(
    statuses: readonly T[],
    labels?: Partial<Record<T, string>>,
    allLabel: string = "All Statuses"
): SelectOption[] {
    return [
        { value: "all", label: allLabel },
        ...statuses.map((status) => ({
            value: status,
            label:
                labels?.[status] ??
                status
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" "),
        })),
    ];
}
