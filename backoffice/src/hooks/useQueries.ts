"use client";

import { useQuery } from "@tanstack/react-query";
import { hubService } from "@/services/hubService";
import { droneService } from "@/services/droneService";
import { flightService } from "@/services/flightService";

export const QUERY_KEYS = {
    hubs: ["hubs"] as const,
    hubsAll: ["hubs", "all"] as const,
    drones: ["drones"] as const,
    dronesAll: ["drones", "all"] as const,
    flights: ["flights"] as const,
    flightsAll: ["flights", "all"] as const,
    airspace: ["airspace"] as const,
    missions: ["missions"] as const,
    connectivityDevices: ["connectivity", "devices"] as const,
};

export function useHubsAll() {
    return useQuery({
        queryKey: QUERY_KEYS.hubsAll,
        queryFn: () => hubService.getAll(),
        staleTime: 1000 * 60, // 1 minute cache for selector dropdowns
    });
}

export function useDronesAll() {
    return useQuery({
        queryKey: QUERY_KEYS.dronesAll,
        queryFn: () => droneService.getAll(),
        staleTime: 1000 * 60,
    });
}

export function useFlightsAll() {
    return useQuery({
        queryKey: QUERY_KEYS.flightsAll,
        queryFn: () => flightService.getAll(),
        staleTime: 1000 * 15,
    });
}
