"use client";

import { useState, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import {
    Loader2,
    Play,
    CheckCircle2,
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    SlidersHorizontal,
} from "lucide-react";
import {
    Modal,
    ChamferButton,
    StatusBadge,
    FormInput,
    CustomSelect,
    TacticalCallout,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
} from "@/components/ui";
import { useHubsAll } from "@/hooks";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { formatCoordinates, formatAltitude, formatNullable, validateSchema } from "@/utils";
import { airspaceService } from "@/services/airspaceService";
import { checkPathBody } from "@/generated/airspace";
import type { CheckPathPayload, CheckPathResult, PathPoint } from "@/types";
import { DEFAULT_AIRSPACE_ZONE_TYPE, HUB_STATUS } from "@/types";

interface AirspaceBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function WaypointInputs({
    idPrefix,
    title,
    labels,
    point,
    onChange,
}: {
    idPrefix: string;
    title: string;
    labels: { lat: string; lon: string; alt: string };
    point: PathPoint;
    onChange: (field: keyof PathPoint, val: number) => void;
}) {
    const [latStr, setLatStr] = useState(() => String(point.lat ?? ""));
    const [lonStr, setLonStr] = useState(() => String(point.lon ?? ""));
    const [altStr, setAltStr] = useState(() => String(point.alt ?? ""));

    const handleFieldChange =
        (field: keyof PathPoint, setStr: (s: string) => void) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setStr(val);
            const parsed = parseFloat(val);
            if (!isNaN(parsed) && isFinite(parsed)) {
                onChange(field, parsed);
            }
        };

    const handleFieldBlur =
        (field: keyof PathPoint, currentStr: string, setStr: (s: string) => void) => () => {
            const parsed = parseFloat(currentStr);
            if (isNaN(parsed) || !isFinite(parsed) || currentStr.trim() === "") {
                setStr(String(point[field] ?? ""));
            }
        };

    return (
        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex flex-col gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600">
                {title}
            </span>
            <div className="grid grid-cols-3 gap-2">
                <FormInput
                    id={`${idPrefix}-lat`}
                    label={labels.lat}
                    type="text"
                    inputMode="decimal"
                    value={latStr}
                    onChange={handleFieldChange("lat", setLatStr)}
                    onBlur={handleFieldBlur("lat", latStr, setLatStr)}
                    placeholder="10.8185"
                    className="font-mono text-xs"
                />
                <FormInput
                    id={`${idPrefix}-lon`}
                    label={labels.lon}
                    type="text"
                    inputMode="decimal"
                    value={lonStr}
                    onChange={handleFieldChange("lon", setLonStr)}
                    onBlur={handleFieldBlur("lon", lonStr, setLonStr)}
                    placeholder="106.6588"
                    className="font-mono text-xs"
                />
                <FormInput
                    id={`${idPrefix}-alt`}
                    label={labels.alt}
                    type="text"
                    inputMode="decimal"
                    value={altStr}
                    onChange={handleFieldChange("alt", setAltStr)}
                    onBlur={handleFieldBlur("alt", altStr, setAltStr)}
                    placeholder="100"
                    className="font-mono text-xs"
                />
            </div>
        </div>
    );
}

export function AirspaceBriefingModal({ isOpen, onClose }: AirspaceBriefingModalProps) {
    const locale = useLocale() as AppLocale;
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

    const resolveZoneTypeBadge = (zoneType?: string | null) => {
        const effective = zoneType ?? DEFAULT_AIRSPACE_ZONE_TYPE;
        if (translateStatusLabel(effective, locale)) return undefined;
        if (effective === "hub_zone") return t("zoneTypeBadges.hub_zone");
        if (effective === "temporary_restriction") return t("zoneTypeBadges.temporary_restriction");
        return undefined;
    };

    const waypointLabels = {
        lat: t("briefing.latitude"),
        lon: t("briefing.longitude"),
        alt: t("briefing.altitudeM"),
    };

    const violations = checkResult?.violations || [];
    const isSafe = checkResult?.safe === true && violations.length === 0;

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
                        <WaypointInputs
                            key={`start-${coordVersion}`}
                            idPrefix="origin-waypoint"
                            title={t("briefing.originWaypoint")}
                            labels={waypointLabels}
                            point={start}
                            onChange={updateWaypoint(setStart)}
                        />

                        <WaypointInputs
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

                {checkResult && (
                    <div className="pt-2 border-t border-slate-200 flex flex-col gap-3">
                        {isSafe ? (
                            <TacticalCallout
                                tone="success"
                                icon={CheckCircle2}
                                title={t("briefing.routeClearTitle")}
                                description={t("briefing.routeClearDesc")}
                                rightSlot={
                                    <StatusBadge status="go" label={t("briefing.clearBadge")} />
                                }
                            />
                        ) : (
                            <>
                                <TacticalCallout
                                    tone="warning"
                                    icon={AlertTriangle}
                                    title={
                                        violations.length === 1
                                            ? t("briefing.routeCompromisedSingle")
                                            : t("briefing.routeCompromisedPlural", {
                                                  count: violations.length,
                                              })
                                    }
                                    description={t("briefing.routeCompromisedDesc")}
                                    rightSlot={
                                        <StatusBadge
                                            status="no_go"
                                            label={t("briefing.conflictBadge")}
                                        />
                                    }
                                />

                                <div className="max-h-48 overflow-y-auto utm-scroll border border-slate-200 rounded-md">
                                    <Table fixed={false}>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>{t("briefing.colZoneName")}</TableHead>
                                                <TableHead>{t("briefing.colType")}</TableHead>
                                                <TableHead>
                                                    {t("briefing.colConflictCoord")}
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {violations.map((v, i) => (
                                                <TableRow key={`${v.zoneId || "violation"}-${i}`}>
                                                    <TableCell bold darkText>
                                                        {formatNullable(
                                                            v.name ?? v.zoneId,
                                                            undefined,
                                                            t("briefing.unnamedZone")
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <StatusBadge
                                                            status={
                                                                v.zoneType ??
                                                                DEFAULT_AIRSPACE_ZONE_TYPE
                                                            }
                                                            label={resolveZoneTypeBadge(v.zoneType)}
                                                        />
                                                    </TableCell>
                                                    <TableCell mono>
                                                        {formatNullable(
                                                            v.conflictPoint,
                                                            (pt) =>
                                                                `${formatCoordinates({ latitude: pt.lat, longitude: pt.lon }, 4)} (${formatAltitude(pt.alt !== undefined ? Math.round(pt.alt * 10) / 10 : undefined)})`
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
