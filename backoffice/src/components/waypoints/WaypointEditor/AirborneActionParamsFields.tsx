"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CustomSelect, FormInput } from "@/components/ui";
import { WAYPOINT_ACTION_TYPE } from "@/types";
import { parseOptionalNumber, type WaypointActionEntry } from "../types";

interface AirborneActionParamsFieldsProps {
    action: WaypointActionEntry;
    index: number;
    isReadOnly: boolean;
    onUpdateParam: (index: number, key: string, value: unknown) => void;
}

export function AirborneActionParamsFields({
    action,
    index,
    isReadOnly,
    onUpdateParam,
}: AirborneActionParamsFieldsProps) {
    const t = useTranslations("waypoints");

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
                        onUpdateParam(index, "duration", parseOptionalNumber(e.target.value))
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
                            onUpdateParam(index, "pitch", parseOptionalNumber(e.target.value))
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
                            onUpdateParam(index, "yaw", parseOptionalNumber(e.target.value))
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
                            onUpdateParam(index, "count", parseOptionalNumber(e.target.value))
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
                            onUpdateParam(index, "pitch", parseOptionalNumber(e.target.value))
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
                            onValueChange={(val) => onUpdateParam(index, "bay", val)}
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
                            onUpdateParam(index, "weightKg", parseOptionalNumber(e.target.value))
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
                        onValueChange={(val) => onUpdateParam(index, "alertType", val)}
                        options={alertToneOptions}
                        disabled={isReadOnly}
                    />
                </div>
            );

        default:
            return null;
    }
}
