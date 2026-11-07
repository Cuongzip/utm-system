"use client";

import { CustomSelect, FormInput, AutoGenInput, type SelectOption } from "@/components/ui";
import { cn } from "@/lib";
import type { MissionFormPayload } from "@/types";

export interface MissionDetailsTabProps {
    formData: MissionFormPayload;
    onFormChange: <K extends keyof MissionFormPayload>(
        field: K,
        value: MissionFormPayload[K]
    ) => void;
    droneId: string;
    onDroneIdChange: (val: string) => void;
    droneOptions: SelectOption[];
    hubOptions: SelectOption[];
    arrivalHubOptions: SelectOption[];
    isEdit?: boolean;
    isReadOnly?: boolean;
    fieldErrors?: Record<string, string>;
    onClearFieldError?: (field: string) => void;
}

export function MissionDetailsTab({
    formData,
    onFormChange,
    droneId,
    onDroneIdChange,
    droneOptions,
    hubOptions,
    arrivalHubOptions,
    isEdit = false,
    isReadOnly = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionDetailsTabProps) {
    return (
        <div className="space-y-4">
            <AutoGenInput
                id="missionCode"
                label="Code"
                showAutoGen={!isEdit}
                disabled={isEdit || isReadOnly}
                required
                manualPlaceholder="e.g. MSN-HAN01"
                value={formData.code ?? ""}
                onChange={(e) => {
                    onFormChange("code", e.target.value);
                    onClearFieldError?.("code");
                }}
                error={fieldErrors.code}
            />

            <FormInput
                id="missionName"
                label="Mission Name"
                required
                placeholder="Enter mission name"
                value={formData.name || ""}
                disabled={isReadOnly}
                onChange={(e) => {
                    onFormChange("name", e.target.value);
                    onClearFieldError?.("name");
                }}
                error={fieldErrors.name}
            />

            <div className="form-group">
                <label className="form-label" htmlFor="missionDesc">
                    Description
                </label>
                <textarea
                    id="missionDesc"
                    rows={3}
                    placeholder="Optional description"
                    value={formData.description || ""}
                    disabled={isReadOnly}
                    onChange={(e) => onFormChange("description", e.target.value)}
                    className="form-input resize-none"
                />
            </div>

            <div className="form-group">
                <label className="form-label">Assigned Drone</label>
                <CustomSelect
                    value={droneId}
                    disabled={isReadOnly}
                    onValueChange={onDroneIdChange}
                    options={droneOptions}
                    placeholder="Select drone"
                />
            </div>

            <div className="form-group">
                <label className="form-label">
                    Departure Vertiport <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={formData.departureHubId || ""}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onFormChange("departureHubId", val);
                        onClearFieldError?.("departureHubId");
                    }}
                    options={hubOptions}
                    placeholder="Select departure hub"
                    className={cn(fieldErrors.departureHubId && "form-input-error")}
                />
                {fieldErrors.departureHubId && (
                    <span className="form-error-msg">{fieldErrors.departureHubId}</span>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Arrival Vertiport</label>
                <CustomSelect
                    value={formData.arrivalHubId || ""}
                    disabled={isReadOnly}
                    onValueChange={(val) => {
                        onFormChange("arrivalHubId", val);
                        onClearFieldError?.("arrivalHubId");
                    }}
                    options={arrivalHubOptions}
                    placeholder="Same as departure"
                    className={cn(fieldErrors.arrivalHubId && "form-input-error")}
                />
                {fieldErrors.arrivalHubId && (
                    <span className="form-error-msg">{fieldErrors.arrivalHubId}</span>
                )}
            </div>
        </div>
    );
}
