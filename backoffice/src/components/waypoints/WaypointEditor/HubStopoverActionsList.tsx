"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
    BatteryCharging,
    Package,
    Plus,
    RefreshCw,
    Repeat,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { ChamferButton, CustomSelect, FormInput } from "@/components/ui";
import { STOPOVER_DEFAULT_GROUND_TIME, STOPOVER_TYPE } from "@/types";
import {
    HUB_STOPOVER_ACTION_TYPES,
    parseOptionalNumber,
    type ActiveStopoverType,
    type HubStopoverActionEntry,
} from "../types";

const HUB_ACTION_ICONS: Record<ActiveStopoverType, LucideIcon> = {
    recharge: BatteryCharging,
    battery_swap: RefreshCw,
    relay_handoff: Repeat,
    payload_pickup: Package,
    payload_dropoff: Package,
};

interface HubStopoverActionsListProps {
    items: HubStopoverActionEntry[];
    isReadOnly: boolean;
    onCommitItems: (nextItems: HubStopoverActionEntry[]) => void;
    onClearGroundTimeError?: () => void;
    onClearPayloadDeltaError?: () => void;
}

export function HubStopoverActionsList({
    items,
    isReadOnly,
    onCommitItems,
    onClearGroundTimeError,
    onClearPayloadDeltaError,
}: HubStopoverActionsListProps) {
    const t = useTranslations("waypoints");

    const hubActionOptions = useMemo(
        () =>
            HUB_STOPOVER_ACTION_TYPES.map((type) => ({
                value: type,
                label: t(`stopoverTypes.${type}`),
            })),
        [t]
    );

    const usedHubTypes = useMemo(() => new Set(items.map((i) => i.type)), [items]);
    const nextAvailableHubType = useMemo(
        () => HUB_STOPOVER_ACTION_TYPES.find((tType) => !usedHubTypes.has(tType)) ?? null,
        [usedHubTypes]
    );

    const handleAddHubAction = () => {
        if (!nextAvailableHubType) return;
        const isPayload =
            nextAvailableHubType === STOPOVER_TYPE.PAYLOAD_PICKUP ||
            nextAvailableHubType === STOPOVER_TYPE.PAYLOAD_DROPOFF;
        onCommitItems([
            ...items,
            {
                type: nextAvailableHubType,
                groundMinutes: STOPOVER_DEFAULT_GROUND_TIME[nextAvailableHubType],
                weightKg: isPayload ? 1.0 : undefined,
            },
        ]);
    };

    const handleChangeHubActionType = (index: number, rawType: string) => {
        const nextType = rawType as ActiveStopoverType;
        const isPayload =
            nextType === STOPOVER_TYPE.PAYLOAD_PICKUP || nextType === STOPOVER_TYPE.PAYLOAD_DROPOFF;
        onCommitItems(
            items.map((item, idx) =>
                idx === index
                    ? {
                          type: nextType,
                          groundMinutes: STOPOVER_DEFAULT_GROUND_TIME[nextType],
                          weightKg: isPayload ? (item.weightKg ?? 1.0) : undefined,
                      }
                    : item
            )
        );
    };

    const handleUpdateHubMinutes = (index: number, rawVal: string) => {
        onClearGroundTimeError?.();
        const parsed = parseOptionalNumber(rawVal);
        onCommitItems(
            items.map((item, idx) =>
                idx === index
                    ? {
                          ...item,
                          groundMinutes:
                              parsed === undefined ? undefined : Math.max(0, Math.round(parsed)),
                      }
                    : item
            )
        );
    };

    const handleUpdateHubWeight = (index: number, rawVal: string) => {
        onClearPayloadDeltaError?.();
        const parsed = parseOptionalNumber(rawVal);
        onCommitItems(
            items.map((item, idx) =>
                idx === index
                    ? {
                          ...item,
                          weightKg: parsed === undefined ? undefined : Math.abs(parsed),
                      }
                    : item
            )
        );
    };

    const handleRemoveHubAction = (index: number) => {
        if (items.length <= 1) return;
        onCommitItems(items.filter((_, idx) => idx !== index));
    };

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t("actions.sectionStopover")}
                </span>
                {!isReadOnly && nextAvailableHubType && (
                    <ChamferButton
                        variant="outline"
                        size="xs"
                        clip="xs"
                        onClick={handleAddHubAction}
                    >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                        <span>{t("actions.addAction")}</span>
                    </ChamferButton>
                )}
            </div>

            <div className="space-y-2">
                {items.map((item, index) => {
                    const Icon = HUB_ACTION_ICONS[item.type] || BatteryCharging;
                    const isPayload =
                        item.type === STOPOVER_TYPE.PAYLOAD_PICKUP ||
                        item.type === STOPOVER_TYPE.PAYLOAD_DROPOFF;
                    const rowOptions = hubActionOptions.filter(
                        (opt) =>
                            opt.value === item.type ||
                            !usedHubTypes.has(opt.value as ActiveStopoverType)
                    );

                    return (
                        <div
                            key={`${item.type}-${index}`}
                            className="p-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] space-y-2.5"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex items-center justify-center shrink-0">
                                    <Icon
                                        className="w-3.5 h-3.5 text-[var(--color-text-secondary)]"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <CustomSelect
                                        options={rowOptions}
                                        value={item.type}
                                        onValueChange={(val) =>
                                            handleChangeHubActionType(index, val)
                                        }
                                        disabled={isReadOnly}
                                    />
                                </div>
                                {!isReadOnly && items.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveHubAction(index)}
                                        aria-label={t("actions.removeAction")}
                                        title={t("actions.removeAction")}
                                        className="w-7 h-7 rounded inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    </button>
                                )}
                            </div>

                            <div className={isPayload ? "form-row-2" : ""}>
                                <FormInput
                                    id={`wpHubMin-${index}`}
                                    label={t("actions.groundDurationMin")}
                                    type="number"
                                    min={0}
                                    step={1}
                                    value={item.groundMinutes ?? ""}
                                    placeholder={String(STOPOVER_DEFAULT_GROUND_TIME[item.type])}
                                    disabled={isReadOnly}
                                    onChange={(e) => handleUpdateHubMinutes(index, e.target.value)}
                                />

                                {isPayload && (
                                    <FormInput
                                        id={`wpHubWeight-${index}`}
                                        label={
                                            item.type === STOPOVER_TYPE.PAYLOAD_PICKUP
                                                ? t("actions.pickupWeightKg")
                                                : t("actions.dropoffWeightKg")
                                        }
                                        type="number"
                                        min={0}
                                        step="0.1"
                                        value={item.weightKg ?? ""}
                                        placeholder="1.5"
                                        disabled={isReadOnly}
                                        onChange={(e) =>
                                            handleUpdateHubWeight(index, e.target.value)
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
