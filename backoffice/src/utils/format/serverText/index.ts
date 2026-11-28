import { buildAirspaceRules, buildConformanceRules } from "./conformanceAirspaceRules";
import { buildConflictRules, buildEmergencyRules } from "./emergencyConflictRules";
import {
    buildFeasibilityAndMissionRules,
    buildSimulationRules,
} from "./feasibilitySimulationRules";
import { buildSeedAndCommandRules } from "./seedCommandRules";
import type { PhraseRule } from "./types";

export * from "./labels";

let cachedViRules: readonly PhraseRule[] | null = null;

export function getViServerTextRules(): readonly PhraseRule[] {
    if (!cachedViRules) {
        cachedViRules = [
            ...buildConformanceRules(),
            ...buildEmergencyRules(),
            ...buildConflictRules(),
            ...buildAirspaceRules(),
            ...buildFeasibilityAndMissionRules(),
            ...buildSimulationRules(),
            ...buildSeedAndCommandRules(),
        ];
    }
    return cachedViRules;
}
