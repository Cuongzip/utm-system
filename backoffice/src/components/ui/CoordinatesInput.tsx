"use client";

import { FormInput } from "./FormInput";

export interface CoordinatesInputProps {
    lat: string;
    lng: string;
    onLatChange: (val: string) => void;
    onLngChange: (val: string) => void;
    latError?: string;
    lngError?: string;
    required?: boolean;
    latId?: string;
    lngId?: string;
}

export function CoordinatesInput({
    lat,
    lng,
    onLatChange,
    onLngChange,
    latError,
    lngError,
    required = true,
    latId = "latitude",
    lngId = "longitude",
}: CoordinatesInputProps) {
    return (
        <div className="form-row-2">
            <FormInput
                id={latId}
                label="Latitude"
                required={required}
                type="number"
                step="any"
                value={lat}
                onChange={(e) => onLatChange(e.target.value)}
                placeholder="e.g. 16.0544"
                error={latError}
            />
            <FormInput
                id={lngId}
                label="Longitude"
                required={required}
                type="number"
                step="any"
                value={lng}
                onChange={(e) => onLngChange(e.target.value)}
                placeholder="e.g. 108.2208"
                error={lngError}
            />
        </div>
    );
}

export default CoordinatesInput;
