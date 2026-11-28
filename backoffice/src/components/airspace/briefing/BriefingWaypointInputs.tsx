"use client";

import { useState } from "react";
import { FormInput } from "@/components/ui";
import type { PathPoint } from "@/types";

interface BriefingWaypointInputsProps {
    idPrefix: string;
    title: string;
    labels: { lat: string; lon: string; alt: string };
    point: PathPoint;
    onChange: (field: keyof PathPoint, val: number) => void;
}

export function BriefingWaypointInputs({
    idPrefix,
    title,
    labels,
    point,
    onChange,
}: BriefingWaypointInputsProps) {
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
