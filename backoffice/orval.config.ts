import { defineConfig } from "orval";

const transformer = "./scripts/spec-transformer.cjs";

export default defineConfig({
    hub: {
        input: {
            target: "http://localhost:8081/hub/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/hub.ts",
            client: "zod",
        },
    },
    drone: {
        input: {
            target: "http://localhost:8081/drone/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/drone.ts",
            client: "zod",
        },
    },
    flight: {
        input: {
            target: "http://localhost:8081/flight/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/flight.ts",
            client: "zod",
        },
    },
    airspace: {
        input: {
            target: "http://localhost:8081/airspace/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/airspace.ts",
            client: "zod",
        },
    },
    connectivity: {
        input: {
            target: "http://localhost:8081/connectivity/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/connectivity.ts",
            client: "zod",
        },
    },
    conflict: {
        input: {
            target: "http://localhost:8081/conflict/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/conflict.ts",
            client: "zod",
        },
    },
    alert: {
        input: {
            target: "http://localhost:8081/alert/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/alert.ts",
            client: "zod",
        },
    },
    telemetry: {
        input: {
            target: "http://localhost:8081/telemetry/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/telemetry.ts",
            client: "zod",
        },
    },
    organization: {
        input: {
            target: "http://localhost:8081/organization/v3/api-docs",
            override: { transformer },
        },
        output: {
            target: "src/generated/organization.ts",
            client: "zod",
        },
    },
});
