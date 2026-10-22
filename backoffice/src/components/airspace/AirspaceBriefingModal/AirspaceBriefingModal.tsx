"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal, OutlineButton, ChamferButton, StatusBadge } from "@/components/ui";
import { airspaceService } from "@/services/airspaceService";
import type { CheckPathResult } from "@/types";

interface AirspaceBriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
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

export function AirspaceBriefingModal({ isOpen, onClose }: AirspaceBriefingModalProps) {
    const [startLat, setStartLat] = useState("10.8185");
    const [startLon, setStartLon] = useState("106.6588");
    const [startAlt, setStartAlt] = useState("100");

    const [endLat, setEndLat] = useState("10.7715");
    const [endLon, setEndLon] = useState("106.7214");
    const [endAlt, setEndAlt] = useState("120");

    const [spacingM, setSpacingM] = useState("200");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkResult, setCheckResult] = useState<CheckPathResult | null>(null);

    const loadPreset = (preset: (typeof PRESET_ROUTES)[0]) => {
        setStartLat(String(preset.start.lat));
        setStartLon(String(preset.start.lon));
        setStartAlt(String(preset.start.alt));
        setEndLat(String(preset.end.lat));
        setEndLon(String(preset.end.lon));
        setEndAlt(String(preset.end.alt));
        setCheckResult(null);
        setError(null);
    };

    const handleRunCheck = async () => {
        const sLat = parseFloat(startLat);
        const sLon = parseFloat(startLon);
        const sAlt = parseFloat(startAlt) || 100;

        const eLat = parseFloat(endLat);
        const eLon = parseFloat(endLon);
        const eAlt = parseFloat(endAlt) || 100;
        const spacing = parseFloat(spacingM) || 200;

        if (isNaN(sLat) || isNaN(sLon) || isNaN(eLat) || isNaN(eLon)) {
            setError("Please enter valid decimal coordinates for both waypoints.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await airspaceService.checkPath({
                points: [
                    { lat: sLat, lon: sLon, alt: sAlt },
                    { lat: eLat, lon: eLon, alt: eAlt },
                ],
                spacingM: spacing,
            });
            setCheckResult(res);
        } catch {
            setError("Airspace path check request failed. Verify backend service status.");
        } finally {
            setLoading(false);
        }
    };

    const violations = checkResult?.violations || [];
    const isSafe = checkResult?.safe === true && violations.length === 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="PRE-FLIGHT AIRSPACE CHECK"
            maxWidth="620px"
            footer={
                <OutlineButton type="button" onClick={onClose}>
                    Close
                </OutlineButton>
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
                            className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[4px] border border-slate-300 transition-colors"
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 flex flex-col gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Start Waypoint
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="form-group">
                            <label className="text-[11px] font-semibold text-slate-500">
                                Latitude
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={startLat}
                                onChange={(e) => setStartLat(e.target.value)}
                                className="form-input font-mono text-xs"
                                placeholder="10.8185"
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-[11px] font-semibold text-slate-500">
                                Longitude
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={startLon}
                                onChange={(e) => setStartLon(e.target.value)}
                                className="form-input font-mono text-xs"
                                placeholder="106.6588"
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-[11px] font-semibold text-slate-500">
                                Altitude (m)
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={startAlt}
                                onChange={(e) => setStartAlt(e.target.value)}
                                className="form-input font-mono text-xs"
                                placeholder="100"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 flex flex-col gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Destination Waypoint
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="form-group">
                            <label className="text-[11px] font-semibold text-slate-500">
                                Latitude
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={endLat}
                                onChange={(e) => setEndLat(e.target.value)}
                                className="form-input font-mono text-xs"
                                placeholder="10.7715"
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-[11px] font-semibold text-slate-500">
                                Longitude
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={endLon}
                                onChange={(e) => setEndLon(e.target.value)}
                                className="form-input font-mono text-xs"
                                placeholder="106.7214"
                            />
                        </div>
                        <div className="form-group">
                            <label className="text-[11px] font-semibold text-slate-500">
                                Altitude (m)
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={endAlt}
                                onChange={(e) => setEndAlt(e.target.value)}
                                className="form-input font-mono text-xs"
                                placeholder="120"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">
                            Sample Spacing:
                        </span>
                        <input
                            type="number"
                            value={spacingM}
                            onChange={(e) => setSpacingM(e.target.value)}
                            className="w-20 form-input font-mono text-xs py-1 px-2"
                        />
                        <span className="text-xs text-slate-500">meters</span>
                    </div>

                    <ChamferButton
                        type="button"
                        variant="dark"
                        onClick={handleRunCheck}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                            <Play className="w-3.5 h-3.5 text-white" />
                        )}
                        <span>{loading ? "Checking Path..." : "Run Airspace Check"}</span>
                    </ChamferButton>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs font-medium">
                        {error}
                    </div>
                )}

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
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="p-2 font-medium text-slate-800">
                                                        {v.name || v.zoneId || "Unnamed Zone"}
                                                    </td>
                                                    <td className="p-2">
                                                        <StatusBadge
                                                            status={v.zoneType || "alert"}
                                                        />
                                                    </td>
                                                    <td className="p-2 font-mono text-[11px] text-slate-600">
                                                        {v.conflictPoint
                                                            ? `${v.conflictPoint.lat.toFixed(4)}, ${v.conflictPoint.lon.toFixed(4)} (${v.conflictPoint.alt ?? 0}m)`
                                                            : "—"}
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
