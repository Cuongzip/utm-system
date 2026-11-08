"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal, ChamferButton, StatusBadge } from "@/components/ui";
import { formatCoordinates, formatAltitude, formatNullable } from "@/utils";
import { airspaceService } from "@/services/airspaceService";
import type { CheckPathPayload, CheckPathResult } from "@/types";

interface AirspaceBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Waypoint {
    lat: number;
    lon: number;
    alt: number;
}

const PRESET_ROUTES = [
    {
        name: "SGN Airport to Thu Thiem Hub",
        start: { lat: 10.8185, lon: 106.6588, alt: 100 },
        end: { lat: 10.7715, lon: 106.7214, alt: 120 },
    },
    {
        name: "District 1 High-Density Test",
        start: { lat: 10.7769, lon: 106.7009, alt: 80 },
        end: { lat: 10.785, lon: 106.698, alt: 120 },
    },
    {
        name: "Da Nang Han River Transit",
        start: { lat: 16.0544, lon: 108.2022, alt: 100 },
        end: { lat: 16.08, lon: 108.235, alt: 100 },
    },
];

function WaypointInputs({
    title,
    point,
    onChange,
}: {
    title: string;
    point: Waypoint;
    onChange: (field: keyof Waypoint, val: number) => void;
}) {
    const [latStr, setLatStr] = useState(() => String(point.lat ?? ""));
    const [lonStr, setLonStr] = useState(() => String(point.lon ?? ""));
    const [altStr, setAltStr] = useState(() => String(point.alt ?? ""));

    useEffect(() => {
        setLatStr(String(point.lat ?? ""));
        setLonStr(String(point.lon ?? ""));
        setAltStr(String(point.alt ?? ""));
    }, [point.lat, point.lon, point.alt]);

    const handleFieldChange =
        (field: keyof Waypoint, setStr: (s: string) => void) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setStr(val);
            const parsed = parseFloat(val);
            if (!isNaN(parsed) && isFinite(parsed)) {
                onChange(field, parsed);
            }
        };

    const handleFieldBlur =
        (field: keyof Waypoint, currentStr: string, setStr: (s: string) => void) => () => {
            const parsed = parseFloat(currentStr);
            if (isNaN(parsed) || !isFinite(parsed) || currentStr.trim() === "") {
                setStr(String(point[field] ?? ""));
            }
        };

    return (
        <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {title}
            </span>
            <div className="grid grid-cols-3 gap-2">
                <div className="form-group">
                    <label className="text-[11px] font-semibold text-slate-500">Latitude</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={latStr}
                        onChange={handleFieldChange("lat", setLatStr)}
                        onBlur={handleFieldBlur("lat", latStr, setLatStr)}
                        placeholder="10.8185"
                        className="form-input font-mono text-xs"
                    />
                </div>
                <div className="form-group">
                    <label className="text-[11px] font-semibold text-slate-500">Longitude</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={lonStr}
                        onChange={handleFieldChange("lon", setLonStr)}
                        onBlur={handleFieldBlur("lon", lonStr, setLonStr)}
                        placeholder="106.6588"
                        className="form-input font-mono text-xs"
                    />
                </div>
                <div className="form-group">
                    <label className="text-[11px] font-semibold text-slate-500">Altitude (m)</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={altStr}
                        onChange={handleFieldChange("alt", setAltStr)}
                        onBlur={handleFieldBlur("alt", altStr, setAltStr)}
                        placeholder="100"
                        className="form-input font-mono text-xs"
                    />
                </div>
            </div>
        </div>
    );
}

export function AirspaceBriefingModal({ isOpen, onClose }: AirspaceBriefingModalProps) {
    const [start, setStart] = useState<Waypoint>({ lat: 10.8185, lon: 106.6588, alt: 100 });
    const [end, setEnd] = useState<Waypoint>({ lat: 10.7715, lon: 106.7214, alt: 120 });
    const [spacingM, setSpacingM] = useState<number>(200);
    const [spacingStr, setSpacingStr] = useState<string>("200");
    const [checkResult, setCheckResult] = useState<CheckPathResult | null>(null);

    const checkMutation = useMutation({
        mutationFn: (payload: CheckPathPayload) => airspaceService.checkPath(payload),
        onSuccess: (data) => setCheckResult(data),
        meta: { defaultErrorMessage: "Failed to perform airspace pre-flight check" },
    });

    const updateWaypoint =
        (setter: React.Dispatch<React.SetStateAction<Waypoint>>) =>
        (field: keyof Waypoint, val: number) => {
            setter((prev) => ({ ...prev, [field]: val }));
        };

    const loadPreset = (preset: (typeof PRESET_ROUTES)[0]) => {
        setStart({ ...preset.start });
        setEnd({ ...preset.end });
        setCheckResult(null);
    };

    const handleRunCheck = () => {
        checkMutation.mutate({
            points: [start, end],
            spacingM: spacingM ?? 200,
        });
    };

    const handleClose = () => {
        setCheckResult(null);
        onClose();
    };

    const violations = checkResult?.violations || [];
    const isSafe = checkResult?.safe === true && violations.length === 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Pre-Flight Airspace Check"
            maxWidth="620px"
            footer={
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    type="button"
                    onClick={handleClose}
                >
                    Close
                </ChamferButton>
            }
        >
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-500">Quick Presets:</span>
                    {PRESET_ROUTES.map((p) => (
                        <button
                            key={p.name}
                            type="button"
                            onClick={() => loadPreset(p)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[4px] border border-slate-300 transition-colors cursor-pointer"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                <WaypointInputs
                    title="Start Waypoint"
                    point={start}
                    onChange={updateWaypoint(setStart)}
                />

                <WaypointInputs
                    title="Destination Waypoint"
                    point={end}
                    onChange={updateWaypoint(setEnd)}
                />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                            Sample Spacing:
                        </span>
                        <input
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
                            className="w-20 form-input font-mono text-xs py-1 px-2"
                        />
                        <span className="text-xs text-slate-500">meters</span>
                    </div>

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
                            {checkMutation.isPending ? "Checking Path..." : "Run Airspace Check"}
                        </span>
                    </ChamferButton>
                </div>

                {checkResult && (
                    <div className="mt-2 pt-3 border-t border-slate-200">
                        {isSafe ? (
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-[6px] flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                <div>
                                    <h4 className="text-xs font-bold text-emerald-900 uppercase">
                                        Route Clear - No Conflicts Detected
                                    </h4>
                                    <p className="text-[11px] text-emerald-700 mt-0.5">
                                        All sampled trajectory coordinates conform to open flight
                                        corridors.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-[6px] flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-900 uppercase">
                                            Route Compromised ({violations.length} Violations)
                                        </h4>
                                        <p className="text-[11px] text-amber-700 mt-0.5">
                                            Trajectory intersects restricted or prohibited airspace
                                            sectors.
                                        </p>
                                    </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-[6px]">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                            <tr>
                                                <th className="p-2">Zone Name</th>
                                                <th className="p-2">Type</th>
                                                <th className="p-2">Conflict Coordinate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {violations.map((v, i) => (
                                                <tr
                                                    key={`${v.zoneId || "violation"}-${i}`}
                                                    className="hover:bg-slate-50"
                                                >
                                                    <td className="p-2 font-medium text-slate-800">
                                                        {formatNullable(
                                                            v.name ?? v.zoneId,
                                                            undefined,
                                                            "Unnamed Zone"
                                                        )}
                                                    </td>
                                                    <td className="p-2">
                                                        <StatusBadge
                                                            status={v.zoneType || "alert"}
                                                        />
                                                    </td>
                                                    <td className="p-2 font-mono text-[11px] text-slate-600">
                                                        {formatNullable(
                                                            v.conflictPoint,
                                                            (pt) =>
                                                                `${formatCoordinates({ latitude: pt.lat, longitude: pt.lon }, 4)} (${formatAltitude(pt.alt)})`
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
