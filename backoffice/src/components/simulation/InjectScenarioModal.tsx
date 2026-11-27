"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, CustomSelect, FormInput } from "@/components/ui";
import { simulationService } from "@/services/simulationService";
import { CHAOS_SCENARIOS } from "./SessionChaosPanel";
import { QUERY_KEYS } from "@/hooks";
import { toast } from "sonner";
import { validateSchema } from "@/utils";
import { injectScenarioBody } from "@/generated/simulation";
import { SIMULATION_SCENARIO, type InjectScenarioPayload, type InjectScenarioType } from "@/types";

export interface InjectScenarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    onSuccess: () => void;
}

function InjectScenarioModalBody({
    onClose,
    sessionId,
    onSuccess,
}: Omit<InjectScenarioModalProps, "isOpen">) {
    const t = useTranslations("simulation.injectModal");
    const tChaos = useTranslations("simulation.chaos");
    const tScenarios = useTranslations("simulation.scenarios");
    const queryClient = useQueryClient();
    const [scenario, setScenario] = useState<InjectScenarioType>(SIMULATION_SCENARIO.GPS_FAILURE);
    const [durationSeconds, setDurationSeconds] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    const injectMutation = useMutation({
        mutationFn: (payload: InjectScenarioPayload) =>
            simulationService.injectScenario(sessionId, payload),
        onSuccess: () => {
            toast.success(t("injectedToast", { scenario: tScenarios(`${scenario}.name`) }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationEvents(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onSuccess();
            onClose();
        },
        meta: { defaultErrorMessage: tChaos("injectError") },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const dur = Number(durationSeconds);
        const validation = validateSchema<InjectScenarioPayload>(injectScenarioBody, {
            scenario,
            config:
                durationSeconds && !isNaN(dur) && dur > 0 ? { durationSeconds: dur } : undefined,
        });
        if (!validation.success) {
            setError(validation.errors.scenario || t("selectScenarioError"));
            return;
        }

        injectMutation.mutate(validation.data);
    };

    return (
        <Modal
            isOpen
            onClose={onClose}
            title={t("title")}
            onSubmit={handleSubmit}
            loading={injectMutation.isPending}
            submitText={t("submitBtn")}
            loadingText={t("loadingText")}
            maxWidth="480px"
        >
            <div className="form-group">
                <label className="form-label" htmlFor="scenarioSelect">
                    {t("scenarioTypeLabel")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    id="scenarioSelect"
                    value={scenario}
                    onValueChange={(val: string) => {
                        setScenario(val as InjectScenarioType);
                        setError(null);
                    }}
                    options={CHAOS_SCENARIOS.map((s) => ({
                        value: s.type,
                        label: tScenarios(`${s.type}.name`),
                        description: tScenarios(`${s.type}.desc`),
                    }))}
                    placeholder={t("selectScenarioPlaceholder")}
                    error={Boolean(error)}
                />
                {error && <span className="form-error-msg">{error}</span>}
            </div>

            <FormInput
                id="durationSeconds"
                label={t("durationLabel")}
                type="number"
                min="1"
                placeholder={
                    scenario === SIMULATION_SCENARIO.C2_LOST
                        ? t("durationC2Placeholder")
                        : t("durationDefaultPlaceholder")
                }
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
            />
            {scenario === SIMULATION_SCENARIO.C2_LOST && (
                <p className="mt-1.5 text-xs text-slate-400">{t("c2Hint")}</p>
            )}
        </Modal>
    );
}

export function InjectScenarioModal({
    isOpen,
    onClose,
    sessionId,
    onSuccess,
}: InjectScenarioModalProps) {
    if (!isOpen) return null;

    return (
        <InjectScenarioModalBody
            key={sessionId}
            onClose={onClose}
            sessionId={sessionId}
            onSuccess={onSuccess}
        />
    );
}
