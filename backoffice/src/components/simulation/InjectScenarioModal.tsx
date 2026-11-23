"use client";

import { useEffect, useState } from "react";
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

export function InjectScenarioModal({
    isOpen,
    onClose,
    sessionId,
    onSuccess,
}: InjectScenarioModalProps) {
    const queryClient = useQueryClient();
    const [scenario, setScenario] = useState<InjectScenarioType>(SIMULATION_SCENARIO.GPS_FAILURE);
    const [durationSeconds, setDurationSeconds] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setScenario(SIMULATION_SCENARIO.GPS_FAILURE);
            setDurationSeconds("");
            setError(null);
        }
    }, [isOpen]);

    const injectMutation = useMutation({
        mutationFn: (payload: InjectScenarioPayload) =>
            simulationService.injectScenario(sessionId, payload),
        onSuccess: () => {
            toast.success(`Emergency scenario "${scenario}" injected successfully`);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationEvents(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulationDetail(sessionId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.simulation });
            onSuccess();
            onClose();
        },
        meta: { defaultErrorMessage: "Failed to inject emergency scenario" },
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
            setError(validation.errors.scenario || "Please select a scenario to inject");
            return;
        }

        injectMutation.mutate(validation.data);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Inject Emergency Scenario"
            onSubmit={handleSubmit}
            loading={injectMutation.isPending}
            submitText="Inject Scenario"
            loadingText="Injecting..."
            maxWidth="480px"
        >
            <div className="form-group">
                <label className="form-label" htmlFor="scenarioSelect">
                    Scenario Type <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={scenario}
                    onValueChange={(val: string) => {
                        setScenario(val as InjectScenarioType);
                        setError(null);
                    }}
                    options={CHAOS_SCENARIOS.map((s) => ({
                        value: s.type,
                        label: s.name,
                        description: s.description,
                    }))}
                    placeholder="Select emergency scenario"
                    error={Boolean(error)}
                />
                {error && <span className="text-xs text-red-500 mt-1 block">{error}</span>}
            </div>

            <FormInput
                id="durationSeconds"
                label="Duration in Seconds (Optional)"
                type="number"
                min="1"
                placeholder="e.g. 30 (leave blank for persistent effect)"
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(e.target.value)}
            />
        </Modal>
    );
}
