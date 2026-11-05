"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal, CustomSelect, FormInput } from "@/components/ui";
import { simulationService } from "@/services/simulationService";
import { CHAOS_SCENARIOS } from "./SessionChaosPanel";
import { toast } from "sonner";
import type { InjectScenarioPayload } from "@/types";

export interface InjectScenarioModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId: string;
    onSuccess?: () => void;
    initialScenario?: string;
}

export function InjectScenarioModal({
    isOpen,
    onClose,
    sessionId,
    onSuccess,
    initialScenario = "gps_failure",
}: InjectScenarioModalProps) {
    const [scenario, setScenario] = useState<string>(initialScenario);
    const [durationSeconds, setDurationSeconds] = useState<string>("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setScenario(initialScenario || "gps_failure");
            setDurationSeconds("");
            setError(null);
        }
    }, [isOpen, initialScenario]);

    const injectMutation = useMutation({
        mutationFn: (payload: InjectScenarioPayload) =>
            simulationService.injectScenario(sessionId, payload),
        onSuccess: () => {
            toast.success(`Emergency scenario "${scenario}" injected successfully`);
            onSuccess?.();
            onClose();
        },
        meta: { defaultErrorMessage: "Failed to inject emergency scenario" },
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!scenario) {
            setError("Please select a scenario to inject");
            return;
        }

        const dur = Number(durationSeconds);
        const payload: InjectScenarioPayload = {
            scenario: scenario as InjectScenarioPayload["scenario"],
            config:
                durationSeconds && !isNaN(dur) && dur > 0 ? { durationSeconds: dur } : undefined,
        };

        injectMutation.mutate(payload);
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
            submitVariant="danger"
            maxWidth="480px"
        >
            <div className="form-group">
                <label className="form-label" htmlFor="scenarioSelect">
                    Scenario Type <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    value={scenario}
                    onValueChange={(val: string) => {
                        setScenario(val);
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

export default InjectScenarioModal;
