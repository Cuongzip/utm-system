"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
    Camera,
    Package,
    Pause,
    Plus,
    RotateCw,
    Trash2,
    Video,
    Volume2,
    type LucideIcon,
} from "lucide-react";
import { ChamferButton, CustomSelect } from "@/components/ui";
import { WAYPOINT_ACTION_TYPE, type WaypointActionType } from "@/types";
import { AIRBORNE_ACTION_TYPES, type WaypointActionEntry } from "../types";
import { AirborneActionParamsFields } from "./AirborneActionParamsFields";

const AIRBORNE_ACTION_ICONS: Partial<Record<WaypointActionType, LucideIcon>> = {
    photo: Camera,
    start_video: Video,
    stop_video: Video,
    payload_drop: Package,
    payload_pickup: Package,
    winch_drop: Package,
    rotate_gimbal: RotateCw,
    hover: Pause,
    sound_alert: Volume2,
};

function defaultParamsForAirborneAction(type: WaypointActionType): Record<string, unknown> {
    switch (type) {
        case WAYPOINT_ACTION_TYPE.HOVER:
            return { duration: 10 };
        case WAYPOINT_ACTION_TYPE.PHOTO:
            return { count: 1, pitch: -45 };
        case WAYPOINT_ACTION_TYPE.ROTATE_GIMBAL:
            return { pitch: -45, yaw: 0 };
        case WAYPOINT_ACTION_TYPE.PAYLOAD_DROP:
        case WAYPOINT_ACTION_TYPE.PAYLOAD_PICKUP:
        case WAYPOINT_ACTION_TYPE.WINCH_DROP:
            return { bay: "1" };
        case WAYPOINT_ACTION_TYPE.SOUND_ALERT:
            return { alertType: "warning" };
        default:
            return {};
    }
}

interface AirborneActionsListProps {
    items: WaypointActionEntry[];
    isReadOnly: boolean;
    onCommitItems: (nextItems: WaypointActionEntry[]) => void;
}

export function AirborneActionsList({
    items,
    isReadOnly,
    onCommitItems,
}: AirborneActionsListProps) {
    const t = useTranslations("waypoints");

    const airborneActionOptions = useMemo(
        () =>
            AIRBORNE_ACTION_TYPES.map((action) => ({
                value: action,
                label: t(`actionTypes.${action}`),
            })),
        [t]
    );

    const handleAddAirborneAction = () => {
        onCommitItems([
            ...items,
            {
                type: WAYPOINT_ACTION_TYPE.PHOTO,
                parameters: defaultParamsForAirborneAction(WAYPOINT_ACTION_TYPE.PHOTO),
            },
        ]);
    };

    const handleChangeAirborneType = (index: number, rawType: string) => {
        const nextType = rawType as WaypointActionType;
        onCommitItems(
            items.map((item, idx) =>
                idx === index
                    ? { type: nextType, parameters: defaultParamsForAirborneAction(nextType) }
                    : item
            )
        );
    };

    const handleUpdateAirborneParam = (index: number, key: string, value: unknown) => {
        onCommitItems(
            items.map((item, idx) =>
                idx === index
                    ? {
                          ...item,
                          parameters: {
                              ...item.parameters,
                              [key]: value,
                          },
                      }
                    : item
            )
        );
    };

    const handleRemoveAirborneAction = (index: number) => {
        onCommitItems(items.filter((_, idx) => idx !== index));
    };

    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {t("actions.sectionInFlight")}
                </span>
                {!isReadOnly && (
                    <ChamferButton
                        variant="outline"
                        size="xs"
                        clip="xs"
                        onClick={handleAddAirborneAction}
                    >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                        <span>{t("actions.addAction")}</span>
                    </ChamferButton>
                )}
            </div>

            {items.length === 0 ? (
                <div className="px-3 py-4 rounded-md border border-dashed border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] text-center">
                    <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                        {t("actions.emptyTitle")}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                        {t("actions.emptyHint")}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((action, index) => {
                        const Icon = AIRBORNE_ACTION_ICONS[action.type] || Camera;
                        return (
                            <div
                                key={`${action.type}-${index}`}
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
                                            options={airborneActionOptions}
                                            value={action.type}
                                            onValueChange={(val) =>
                                                handleChangeAirborneType(index, val)
                                            }
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAirborneAction(index)}
                                            aria-label={t("actions.removeAction")}
                                            title={t("actions.removeAction")}
                                            className="w-7 h-7 rounded inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                        </button>
                                    )}
                                </div>

                                <AirborneActionParamsFields
                                    action={action}
                                    index={index}
                                    isReadOnly={isReadOnly}
                                    onUpdateParam={handleUpdateAirborneParam}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
