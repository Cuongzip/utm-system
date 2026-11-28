"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/hooks";
import { flightService } from "@/services/flightService";
import type { Flight } from "@/types";

interface FlightTarget {
    id: string;
    flightNumber?: string | null;
}

interface UseFlightLifecycleActionsOptions {
    onAborted?: () => void;
}

export function useFlightLifecycleActions(options?: UseFlightLifecycleActionsOptions) {
    const t = useTranslations("flights");
    const queryClient = useQueryClient();

    const invalidateFlightQueries = (flightId: string) => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flightId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
    };

    const getLabel = (flight: FlightTarget, overrideLabel?: string) =>
        overrideLabel || flight.flightNumber || flight.id;

    const authorizeFlightMutation = useMutation({
        mutationFn: ({ flight }: { flight: FlightTarget; label?: string }) =>
            flightService.authorizeFlight(flight.id),
        onSuccess: (_data, { flight, label }) => {
            toast.success(t("toasts.authorized", { flight: getLabel(flight, label) }));
            invalidateFlightQueries(flight.id);
        },
        meta: { defaultErrorMessage: t("toasts.authorizeFailed") },
    });

    const startFlightMutation = useMutation({
        mutationFn: ({ flight }: { flight: FlightTarget; label?: string }) =>
            flightService.startFlight(flight.id),
        onSuccess: (_data, { flight, label }) => {
            toast.success(t("toasts.started", { flight: getLabel(flight, label) }));
            invalidateFlightQueries(flight.id);
        },
        meta: { defaultErrorMessage: t("toasts.startFailed") },
    });

    const completeFlightMutation = useMutation({
        mutationFn: ({ flight }: { flight: FlightTarget; label?: string }) =>
            flightService.completeFlight(flight.id),
        onSuccess: (_data, { flight, label }) => {
            toast.success(t("toasts.completed", { flight: getLabel(flight, label) }));
            invalidateFlightQueries(flight.id);
        },
        meta: { defaultErrorMessage: t("toasts.completeFailed") },
    });

    const abortFlightMutation = useMutation({
        mutationFn: ({ flight }: { flight: FlightTarget; label?: string }) =>
            flightService.abortFlight(flight.id),
        onSuccess: (_data, { flight, label }) => {
            toast.success(t("toasts.aborted", { flight: getLabel(flight, label) }));
            options?.onAborted?.();
            invalidateFlightQueries(flight.id);
        },
        meta: { defaultErrorMessage: t("toasts.abortFailed") },
    });

    const authorizeByFlight = (flight: Flight) => authorizeFlightMutation.mutate({ flight });
    const startByFlight = (flight: Flight) => startFlightMutation.mutate({ flight });
    const completeByFlight = (flight: Flight) => completeFlightMutation.mutate({ flight });
    const abortByFlight = (flight: Flight) => abortFlightMutation.mutate({ flight });

    return {
        invalidateFlightQueries,
        authorizeFlightMutation,
        startFlightMutation,
        completeFlightMutation,
        abortFlightMutation,
        authorizeByFlight,
        startByFlight,
        completeByFlight,
        abortByFlight,
        isLifecyclePending:
            authorizeFlightMutation.isPending ||
            startFlightMutation.isPending ||
            completeFlightMutation.isPending ||
            abortFlightMutation.isPending,
    };
}
