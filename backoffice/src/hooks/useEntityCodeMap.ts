"use client";

import { useMemo } from "react";
import { useDronesAll, useFlightsAll, useHubsAll } from "./useQueries";

export function useEntityCodeMap(): ReadonlyMap<string, string> {
    const { data: flights = [] } = useFlightsAll();
    const { data: drones = [] } = useDronesAll();
    const { data: hubs = [] } = useHubsAll();

    return useMemo(() => {
        const map = new Map<string, string>();
        for (const f of flights) {
            if (f.id && f.flightNumber) {
                map.set(f.id, f.flightNumber);
                map.set(f.id.toLowerCase(), f.flightNumber);
            }
        }
        for (const d of drones) {
            const label = d.registrationNumber || d.model;
            if (d.id && label) {
                map.set(d.id, label);
                map.set(d.id.toLowerCase(), label);
            }
        }
        for (const h of hubs) {
            const label = h.code || h.name;
            if (h.id && label) {
                map.set(h.id, label);
                map.set(h.id.toLowerCase(), label);
            }
        }
        return map;
    }, [flights, drones, hubs]);
}
