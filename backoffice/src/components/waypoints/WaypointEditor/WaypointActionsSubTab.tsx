"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
    BatteryCharging,
    Camera,
    Video,
    Package,
    RefreshCw,
    Repeat,
    RotateCw,
    Pause,
    Volume2,
    Plus,
    Trash2,
    type LucideIcon,
} from "lucide-react";
import { ChamferButton, CustomSelect, FormInput } from "@/components/ui";
import {
    STOPOVER_DEFAULT_GROUND_TIME,
    STOPOVER_TYPE,
    WAYPOINT_ACTION_TYPE,
    WAYPOINT_TYPE,
    type WaypointActionType,
} from "@/types";
import {
    AIRBORNE_ACTION_TYPES,
    HUB_STOPOVER_ACTION_TYPES,
    isHubWaypointItem,
    parseHubActionItems,
    parseOptionalNumber,
    parseWaypointActionItems,
    serializeHubActionItems,
    serializeWaypointActions,
    type ActiveStopoverType,
    type HubStopoverActionEntry,
    type WaypointActionEntry,
    type WaypointItem,
} from "../types";

export interface WaypointActionsSubTabProps<T extends WaypointItem> {
    waypoint: T;
    onUpdate: (wp: T) => void;
    isReadOnly?: boolean;
    error?: string;
    stopoverTypeError?: string;
    groundTimeError?: string;
    payloadDeltaError?: string;
    onClearStopoverTypeError?: () => void;
    onClearGroundTimeError?: () => void;
    onClearPayloadDeltaError?: () => void;
}

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

const HUB_ACTION_ICONS: Record<ActiveStopoverType, LucideIcon> = {
    recharge: BatteryCharging,
    battery_swap: RefreshCw,
    relay_handoff: Repeat,
    payload_pickup: Package,
    payload_dropoff: Package,
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

export function WaypointActionsSubTab<T extends WaypointItem>({
    waypoint,
    onUpdate,
    isReadOnly = false,
    error,
    stopoverTypeError,
    groundTimeError,
    payloadDeltaError,
    onClearStopoverTypeError,
    onClearGroundTimeError,
    onClearPayloadDeltaError,
}: WaypointActionsSubTabProps<T>) {
    const t = useTranslations("waypoints");
    const isHubNode = isHubWaypointItem(waypoint);

    const airborneActionOptions = useMemo(
        () =>
            AIRBORNE_ACTION_TYPES.map((action) => ({
                value: action,
                label: t(`actionTypes.${action}`),
            })),
        [t]
    );

    const hubActionOptions = useMemo(
        () =>
            HUB_STOPOVER_ACTION_TYPES.map((type) => ({
                value: type,
                label: t(`stopoverTypes.${type}`),
            })),
        [t]
    );

    const bayOptions = useMemo(
        () => [
            { value: "1", label: t("actions.bay1") },
            { value: "2", label: t("actions.bay2") },
            { value: "all", label: t("actions.bayAll") },
        ],
        [t]
    );

    const alertToneOptions = useMemo(
        () => [
            { value: "warning", label: t("actions.alertWarning") },
            { value: "arrival", label: t("actions.alertArrival") },
            { value: "custom", label: t("actions.alertCustom") },
        ],
        [t]
    );

    const airborneItems = useMemo(() => parseWaypointActionItems(waypoint), [waypoint]);
    const hubItems = useMemo(
        () => (isHubNode ? parseHubActionItems(waypoint) : []),
        [isHubNode, waypoint]
    );
    const waitConfirmed = Boolean(
        waypoint.waitForConfirmation ?? waypoint.actions?.waitForConfirmation
    );

    const commitAirborneItems = (nextItems: WaypointActionEntry[], nextWait = waitConfirmed) => {
        const { actions, hoverDurationSec } = serializeWaypointActions(
            nextItems,
            nextWait,
            waypoint.actions
        );
        onUpdate({
            ...waypoint,
            actions,
            hoverDurationSec,
            waitForConfirmation: nextWait,
        });
    };

    const commitHubItems = (nextHubItems: HubStopoverActionEntry[], nextWait = waitConfirmed) => {
        onClearStopoverTypeError?.();
        const { stopoverType, groundTimeMinutes, payloadDeltaKg, actions } =
            serializeHubActionItems(nextHubItems, nextWait, waypoint.actions);
        onUpdate({
            ...waypoint,
            waypointType: WAYPOINT_TYPE.HUB,
            stopoverType,
            groundTimeMinutes,
            payloadDeltaKg,
            waitForConfirmation: nextWait,
            actions,
        });
    };

    const handleAddAirborneAction = () => {
        commitAirborneItems([
            ...airborneItems,
            {
                type: WAYPOINT_ACTION_TYPE.PHOTO,
                parameters: defaultParamsForAirborneAction(WAYPOINT_ACTION_TYPE.PHOTO),
            },
        ]);
    };

    const handleChangeAirborneType = (index: number, rawType: string) => {
        const nextType = rawType as WaypointActionType;
        commitAirborneItems(
            airborneItems.map((item, idx) =>
                idx === index
                    ? { type: nextType, parameters: defaultParamsForAirborneAction(nextType) }
                    : item
            )
        );
    };

    const handleUpdateAirborneParam = (index: number, key: string, value: unknown) => {
        commitAirborneItems(
            airborneItems.map((item, idx) =>
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
        commitAirborneItems(airborneItems.filter((_, idx) => idx !== index));
    };

    const usedHubTypes = useMemo(() => new Set(hubItems.map((i) => i.type)), [hubItems]);
    const nextAvailableHubType = useMemo(
        () => HUB_STOPOVER_ACTION_TYPES.find((tType) => !usedHubTypes.has(tType)) ?? null,
        [usedHubTypes]
    );

    const handleAddHubAction = () => {
        if (!nextAvailableHubType) return;
        const isPayload =
            nextAvailableHubType === STOPOVER_TYPE.PAYLOAD_PICKUP ||
            nextAvailableHubType === STOPOVER_TYPE.PAYLOAD_DROPOFF;
        commitHubItems([
            ...hubItems,
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
        commitHubItems(
            hubItems.map((item, idx) =>
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
        commitHubItems(
            hubItems.map((item, idx) =>
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
        commitHubItems(
            hubItems.map((item, idx) =>
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
        if (hubItems.length <= 1) return;
        commitHubItems(hubItems.filter((_, idx) => idx !== index));
    };

    const handleWaitToggle = (checked: boolean) => {
        if (isHubNode) {
            commitHubItems(hubItems, checked);
        } else {
            commitAirborneItems(airborneItems, checked);
        }
    };

    const renderAirborneParameters = (action: WaypointActionEntry, index: number) => {
        switch (action.type) {
            case WAYPOINT_ACTION_TYPE.HOVER:
                return (
                    <FormInput
                        id={`wpActionDur-${index}`}
                        label={t("actions.duration")}
                        type="number"
                        min="1"
                        max="3600"
                        value={(action.parameters?.duration as number | undefined) ?? ""}
                        placeholder="10"
                        disabled={isReadOnly}
                        onChange={(e) =>
                            handleUpdateAirborneParam(
                                index,
                                "duration",
                                parseOptionalNumber(e.target.value)
                            )
                        }
                    />
                );

            case WAYPOINT_ACTION_TYPE.ROTATE_GIMBAL:
                return (
                    <div className="form-row-2">
                        <FormInput
                            id={`wpActionPitch-${index}`}
                            label={t("actions.pitchDeg")}
                            type="number"
                            min="-90"
                            max="90"
                            value={(action.parameters?.pitch as number | undefined) ?? ""}
                            placeholder="-45"
                            disabled={isReadOnly}
                            onChange={(e) =>
                                handleUpdateAirborneParam(
                                    index,
                                    "pitch",
                                    parseOptionalNumber(e.target.value)
                                )
                            }
                        />
                        <FormInput
                            id={`wpActionYaw-${index}`}
                            label={t("actions.yawDeg")}
                            type="number"
                            min="0"
                            max="360"
                            value={(action.parameters?.yaw as number | undefined) ?? ""}
                            placeholder="0"
                            disabled={isReadOnly}
                            onChange={(e) =>
                                handleUpdateAirborneParam(
                                    index,
                                    "yaw",
                                    parseOptionalNumber(e.target.value)
                                )
                            }
                        />
                    </div>
                );

            case WAYPOINT_ACTION_TYPE.PHOTO:
                return (
                    <div className="form-row-2">
                        <FormInput
                            id={`wpActionCount-${index}`}
                            label={t("actions.photoCount")}
                            type="number"
                            min="1"
                            max="20"
                            value={(action.parameters?.count as number | undefined) ?? ""}
                            placeholder="1"
                            disabled={isReadOnly}
                            onChange={(e) =>
                                handleUpdateAirborneParam(
                                    index,
                                    "count",
                                    parseOptionalNumber(e.target.value)
                                )
                            }
                        />
                        <FormInput
                            id={`wpActionPhotoPitch-${index}`}
                            label={t("actions.pitchDeg")}
                            type="number"
                            min="-90"
                            max="90"
                            value={(action.parameters?.pitch as number | undefined) ?? ""}
                            placeholder="-45"
                            disabled={isReadOnly}
                            onChange={(e) =>
                                handleUpdateAirborneParam(
                                    index,
                                    "pitch",
                                    parseOptionalNumber(e.target.value)
                                )
                            }
                        />
                    </div>
                );

            case WAYPOINT_ACTION_TYPE.PAYLOAD_DROP:
            case WAYPOINT_ACTION_TYPE.PAYLOAD_PICKUP:
            case WAYPOINT_ACTION_TYPE.WINCH_DROP:
                return (
                    <div className="form-row-2">
                        <div className="form-group">
                            <label className="form-label" htmlFor={`wpActionBay-${index}`}>
                                {t("actions.payloadBay")}
                            </label>
                            <CustomSelect
                                value={(action.parameters?.bay as string) || "1"}
                                onValueChange={(val) =>
                                    handleUpdateAirborneParam(index, "bay", val)
                                }
                                options={bayOptions}
                                disabled={isReadOnly}
                            />
                        </div>
                        <FormInput
                            id={`wpActionWeight-${index}`}
                            label={t("actions.payloadWeightKg")}
                            type="number"
                            step="0.1"
                            min="0"
                            value={(action.parameters?.weightKg as number | undefined) ?? ""}
                            placeholder="1.5"
                            disabled={isReadOnly}
                            onChange={(e) =>
                                handleUpdateAirborneParam(
                                    index,
                                    "weightKg",
                                    parseOptionalNumber(e.target.value)
                                )
                            }
                        />
                    </div>
                );

            case WAYPOINT_ACTION_TYPE.SOUND_ALERT:
                return (
                    <div className="form-group">
                        <label className="form-label" htmlFor={`wpActionTone-${index}`}>
                            {t("actions.alertType")}
                        </label>
                        <CustomSelect
                            value={(action.parameters?.alertType as string) || "warning"}
                            onValueChange={(val) =>
                                handleUpdateAirborneParam(index, "alertType", val)
                            }
                            options={alertToneOptions}
                            disabled={isReadOnly}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    const mergedError = error || stopoverTypeError || groundTimeError || payloadDeltaError;

    return (
        <div className="space-y-3.5 pt-1">
            {mergedError && <p className="text-xs text-red-500 font-medium">{mergedError}</p>}

            {isHubNode ? (
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
                        {hubItems.map((item, index) => {
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
                                        {!isReadOnly && hubItems.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveHubAction(index)}
                                                aria-label={t("actions.removeAction")}
                                                title={t("actions.removeAction")}
                                                className="w-7 h-7 rounded inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                            >
                                                <Trash2
                                                    className="w-3.5 h-3.5"
                                                    aria-hidden="true"
                                                />
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
                                            placeholder={String(
                                                STOPOVER_DEFAULT_GROUND_TIME[item.type]
                                            )}
                                            disabled={isReadOnly}
                                            onChange={(e) =>
                                                handleUpdateHubMinutes(index, e.target.value)
                                            }
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
            ) : (
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

                    {airborneItems.length === 0 ? (
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
                            {airborneItems.map((action, index) => {
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
                                                    onClick={() =>
                                                        handleRemoveAirborneAction(index)
                                                    }
                                                    aria-label={t("actions.removeAction")}
                                                    title={t("actions.removeAction")}
                                                    className="w-7 h-7 rounded inline-flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-tech-red)] hover:bg-red-50 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                                >
                                                    <Trash2
                                                        className="w-3.5 h-3.5"
                                                        aria-hidden="true"
                                                    />
                                                </button>
                                            )}
                                        </div>

                                        {renderAirborneParameters(action, index)}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 pt-1">
                <input
                    type="checkbox"
                    id="waitConfirmation"
                    checked={waitConfirmed}
                    disabled={isReadOnly}
                    onChange={(e) => handleWaitToggle(e.target.checked)}
                    className="rounded border-[var(--color-border-default)] cursor-pointer"
                />
                <label
                    htmlFor="waitConfirmation"
                    className="text-xs text-[var(--color-text-primary)] cursor-pointer font-medium"
                >
                    {t("actions.waitConfirmation")}
                </label>
            </div>
        </div>
    );
}
