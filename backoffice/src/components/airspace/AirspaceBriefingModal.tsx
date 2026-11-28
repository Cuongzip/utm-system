"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Play, ChevronDown, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Modal, ChamferButton, FormInput, CustomSelect } from "@/components/ui";
import { useHubsAll } from "@/hooks";
import { formatCoordinates, formatAltitude, validateSchema } from "@/utils";
import { airspaceService } from "@/services/airspaceService";
import { checkPathBody } from "@/generated/airspace";
import type { CheckPathPayload, CheckPathResult, PathPoint } from "@/types";
import { HUB_STATUS } from "@/types";
import { BriefingWaypointInputs } from "./briefing/BriefingWaypointInputs";
import { BriefingCheckResultPanel } from "./briefing/BriefingCheckResultPanel";

interface AirspaceBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AirspaceBriefingModal({ isOpen, onClose }: AirspaceBriefingModalProps) {
    const t = useTranslations("airspace");
    const tCommon = useTranslations("common");
    const { data: hubs = [] } = useHubsAll();
    const [originHubId, setOriginHubId] = useState("");
    const [destHubId, setDestHubId] = useState("");
    const [start, setStart] = useState<PathPoint>({ lat: 10.8185, lon: 106.6588, alt: 120 });
    const [end, setEnd] = useState<PathPoint>({ lat: 10.7715, lon: 106.7214, alt: 120 });
    const [cruiseAltStr, setCruiseAltStr] = useState<string>("120");
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [coordVersion, setCoordVersion] = useState(0);
    const [spacingM, setSpacingM] = useState<number>(200);
    const [spacingStr, setSpacingStr] = useState<string>("200");
    const [validationError, setValidationError] = useState<string | null>(null);
    const [checkResult, setCheckResult] = useState<CheckPathResult | null>(null);

    const activeHubs = useMemo(
        () =>
            hubs.filter(
                (h) =>
                    (h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE &&
                    h.location?.latitude != null &&
                    h.location?.longitude != null
            ),
        [hubs]
    );

    const hubOptions = useMemo(
        () =>
            activeHubs.map((h) => ({
                value: h.id,
                label: `${h.code ? `${h.code} — ` : ""}${h.name}`,
            })),
        [activeHubs]
    );

    const checkMutation = useMutation({
        mutationFn: (payload: CheckPathPayload) => airspaceService.checkPath(payload),
        onSuccess: (data) => {
            setValidationError(null);
            setCheckResult(data);
        },
        meta: { defaultErrorMessage: t("briefing.checkFailed") },
    });

    const updateWaypoint =
        (setter: React.Dispatch<React.SetStateAction<PathPoint>>) =>
        (field: keyof PathPoint, val: number) => {
            setValidationError(null);
            setter((prev) => ({ ...prev, [field]: val }));
        };

    const handleSelectOriginHub = (id: string) => {
        setOriginHubId(id);
        const hub = activeHubs.find((h) => h.id === id);
        if (hub?.location) {
            setStart((prev) => ({
                lat: Number(hub.location!.latitude.toFixed(5)),
                lon: Number(hub.location!.longitude.toFixed(5)),
                alt: prev.alt ?? 100,
            }));
            setCoordVersion((v) => v + 1);
            setCheckResult(null);
            setValidationError(null);
        }
    };

    const handleSelectDestHub = (id: string) => {
        setDestHubId(id);
        const hub = activeHubs.find((h) => h.id === id);
        if (hub?.location) {
            setEnd((prev) => ({
                lat: Number(hub.location!.latitude.toFixed(5)),
                lon: Number(hub.location!.longitude.toFixed(5)),
                alt: prev.alt ?? 120,
            }));
            setCoordVersion((v) => v + 1);
            setCheckResult(null);
            setValidationError(null);
        }
    };

    const handleRunCheck = () => {
        const validation = validateSchema<CheckPathPayload>(checkPathBody, {
            points: [start, end],
            spacingM: spacingM ?? 200,
        });
        if (!validation.success) {
            const firstMsg = Object.values(validation.errors)[0] || t("briefing.invalidCoords");
            setValidationError(firstMsg);
            return;
        }
        setValidationError(null);
        checkMutation.mutate(validation.data);
    };

    const handleClose = () => {
        setCheckResult(null);
        setValidationError(null);
        onClose();
    };

    const waypointLabels = {
        lat: t("briefing.latitude"),
        lon: t("briefing.longitude"),
        alt: t("briefing.altitudeM"),
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t("briefing.title")}
            maxWidth="620px"
            footer={
                <div className="flex items-center justify-between w-full gap-2">
                    <ChamferButton
                        type="button"
                        variant="dark"
                        size="sm"
                        clip="sm"
                        onClick={handleRunCheck}
                        disabled={checkMutation.isPending}
                    >
                        {checkMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                            <Play className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>
                            {checkMutation.isPending
                                ? t("briefing.checking")
                                : t("briefing.runCheck")}
                        </span>
                    </ChamferButton>

                    <ChamferButton
                        variant="outline"
                        size="sm"
                        clip="xs"
                        type="button"
                        onClick={handleClose}
                    >
                        {tCommon("close")}
                    </ChamferButton>
                </div>
            }
        >
            <div className="flex flex-col gap-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    {hubOptions.length > 0 && (
                        <>
                            <div className="form-group sm:col-span-5">
                                <label htmlFor="briefing-origin-hub" className="form-label">
                                    {t("briefing.originHub")}
                                </label>
                                <CustomSelect
                                    id="briefing-origin-hub"
                                    value={originHubId}
                                    onValueChange={handleSelectOriginHub}
                                    options={hubOptions}
                                    placeholder={t("briefing.originHubPlaceholder")}
                                />
                            </div>
                            <div className="form-group sm:col-span-5">
                                <label htmlFor="briefing-dest-hub" className="form-label">
                                    {t("briefing.destHub")}
                                </label>
                                <CustomSelect
                                    id="briefing-dest-hub"
                                    value={destHubId}
                                    onValueChange={handleSelectDestHub}
                                    options={hubOptions}
                                    placeholder={t("briefing.destHubPlaceholder")}
                                />
                            </div>
                        </>
                    )}
                    <div
                        className={
                            hubOptions.length > 0 ? "form-group sm:col-span-2" : "form-group w-44"
                        }
                    >
                        <FormInput
                            id="briefing-cruise-alt"
                            label={t("briefing.cruiseAlt")}
                            type="number"
                            min="5"
                            max="1000"
                            value={cruiseAltStr}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCruiseAltStr(val);
                                const parsed = parseFloat(val);
                                if (!isNaN(parsed) && parsed >= 0) {
                                    setStart((prev) => ({ ...prev, alt: parsed }));
                                    setEnd((prev) => ({ ...prev, alt: parsed }));
                                    setCoordVersion((v) => v + 1);
                                    setValidationError(null);
                                }
                            }}
                            onBlur={() => {
                                const parsed = parseFloat(cruiseAltStr);
                                if (isNaN(parsed) || parsed < 0) {
                                    setCruiseAltStr(String(end.alt ?? 120));
                                }
                            }}
                            className="font-mono text-xs"
                        />
                    </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-slate-600 tabular-nums">
                        {formatCoordinates({ latitude: start.lat, longitude: start.lon }, 4)} →{" "}
                        {formatCoordinates({ latitude: end.lat, longitude: end.lon }, 4)} ·{" "}
                        {formatAltitude(end.alt)}
                    </span>
                    <button
                        type="button"
                        aria-expanded={showAdvanced}
                        onClick={() => setShowAdvanced((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-slate-700 hover:text-slate-950 cursor-pointer"
                    >
                        <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                        <span>{t("briefing.customCoords")}</span>
                        {showAdvanced ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>

                {showAdvanced && (
                    <div className="flex flex-col gap-3 pt-1">
                        <BriefingWaypointInputs
                            key={`start-${coordVersion}`}
                            idPrefix="origin-waypoint"
                            title={t("briefing.originWaypoint")}
                            labels={waypointLabels}
                            point={start}
                            onChange={updateWaypoint(setStart)}
                        />

                        <BriefingWaypointInputs
                            key={`end-${coordVersion}`}
                            idPrefix="dest-waypoint"
                            title={t("briefing.destWaypoint")}
                            labels={waypointLabels}
                            point={end}
                            onChange={updateWaypoint(setEnd)}
                        />

                        <div className="w-48">
                            <FormInput
                                id="briefing-sample-spacing"
                                label={t("briefing.sampleSpacing")}
                                type="number"
                                min="10"
                                max="5000"
                                value={spacingStr}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSpacingStr(val);
                                    const parsed = parseInt(val, 10);
                                    if (!isNaN(parsed) && parsed > 0) {
                                        setSpacingM(parsed);
                                    }
                                }}
                                onBlur={() => {
                                    const parsed = parseInt(spacingStr, 10);
                                    if (isNaN(parsed) || parsed <= 0) {
                                        setSpacingStr(String(spacingM ?? 200));
                                    }
                                }}
                                className="font-mono text-xs"
                            />
                        </div>
                    </div>
                )}

                {validationError && (
                    <span className="form-error-msg" role="alert">
                        {validationError}
                    </span>
                )}

                {checkResult && <BriefingCheckResultPanel checkResult={checkResult} />}
            </div>
        </Modal>
    );
}
