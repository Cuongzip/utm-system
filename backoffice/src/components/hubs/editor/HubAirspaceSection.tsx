"use client";

import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FormInput } from "@/components/ui";
import type { HubFormPayload } from "@/types";

interface HubAirspaceSectionProps {
    register: UseFormRegister<HubFormPayload>;
    errors: FieldErrors<HubFormPayload>;
}

export function HubAirspaceSection({ register, errors }: HubAirspaceSectionProps) {
    const t = useTranslations("hubs.editor");

    return (
        <section className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                {t("airspaceSection")}
            </h3>

            <div className="form-row-2">
                <FormInput
                    id="airspaceRadius"
                    label={t("protectionRadiusM")}
                    required
                    type="number"
                    step="any"
                    min={1}
                    inputMode="decimal"
                    placeholder="1500"
                    error={errors.airspaceRadius?.message}
                    {...register("airspaceRadius", { valueAsNumber: true })}
                />
                <FormInput
                    id="maxSimultaneousDrones"
                    label={t("maxConcurrentDrones")}
                    type="number"
                    step={1}
                    min={1}
                    inputMode="numeric"
                    placeholder="10"
                    error={errors.maxSimultaneousDrones?.message}
                    {...register("maxSimultaneousDrones", { valueAsNumber: true })}
                />
            </div>

            <div className="form-row-2">
                <FormInput
                    id="airspaceFloor"
                    label={t("airspaceFloorM")}
                    type="number"
                    step="any"
                    min={0}
                    inputMode="decimal"
                    placeholder="0"
                    error={errors.airspaceFloor?.message}
                    {...register("airspaceFloor", { valueAsNumber: true })}
                />
                <FormInput
                    id="airspaceCeiling"
                    label={t("airspaceCeilingM")}
                    type="number"
                    step="any"
                    min={1}
                    inputMode="decimal"
                    placeholder="120"
                    error={errors.airspaceCeiling?.message}
                    {...register("airspaceCeiling", { valueAsNumber: true })}
                />
            </div>
        </section>
    );
}
