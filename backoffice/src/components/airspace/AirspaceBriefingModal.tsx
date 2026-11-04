"use client";

import { useState } from "react";
import { Loader2, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { Modal, OutlineButton, ChamferButton, StatusBadge } from "@/components/ui";
import { airspaceService } from "@/services/airspaceService";
import { checkPathBody } from "@/generated/airspace";
import { validateSchema } from "@/utils";
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

interface RouteFormState {
    startLat: string;
    startLon: string;
    startAlt: string;
    endLat: string;
    endLon: string;
    endAlt: string;
    spacingM: string;
}

const INITIAL_FORM: RouteFormState = {
    startLat: "10.8185",
    startLon: "106.6588",
    startAlt: "100",
    endLat: "10.7715",
    endLon: "106.7214",
    endAlt: "120",
    spacingM: "200",
};

export function AirspaceBriefingModal({ isOpen, onClose }: AirspaceBriefingModalProps) {
    const [form, setForm] = useState<RouteFormState>(INITIAL_FORM);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkResult, setCheckResult] = useState<CheckPathResult | null>(null);

    const updateField = (field: keyof RouteFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const loadPreset = (preset: (typeof PRESET_ROUTES)[0]) => {
        setForm((prev) => ({
            ...prev,
            startLat: String(preset.start.lat),
            startLon: String(preset.start.lon),
            startAlt: String(preset.start.alt),
            endLat: String(preset.end.lat),
            endLon: String(preset.end.lon),
            endAlt: String(preset.end.alt),
        }));
        setCheckResult(null);
        setError(null);
    };

    const handleRunCheck = async () => {
        const payload = {
            points: [
                {
                    lat: Number(form.startLat),
                    lon: Number(form.startLon),
                    alt: Number(form.startAlt) || 100,
                },
                {
                    lat: Number(form.endLat),
                    lon: Number(form.endLon),
                    alt: Number(form.endAlt) || 100,
                },
            ],
            spacingM: Number(form.spacingM) || 200,
        };

        const validation = validateSchema(checkPathBody, payload);
        if (!validation.success) {
            setError("Please enter valid decimal coordinates for both waypoints.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await airspaceService.checkPath(payload);
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
            title="Pre-Flight Airspace Check"
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
                                value={form.startLat}
                                onChange={(e) => updateField("startLat", e.target.value)}
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
                                value={form.startLon}
                                onChange={(e) => updateField("startLon", e.target.value)}
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
                                value={form.startAlt}
                                onChange={(e) => updateField("startAlt", e.target.value)}
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
                                value={form.endLat}
                                onChange={(e) => updateField("endLat", e.target.value)}
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
                                value={form.endLon}
                                onChange={(e) => updateField("endLon", e.target.value)}
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
                                value={form.endAlt}
                                onChange={(e) => updateField("endAlt", e.target.value)}
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
                            value={form.spacingM}
                            onChange={(e) => updateField("spacingM", e.target.value)}
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
