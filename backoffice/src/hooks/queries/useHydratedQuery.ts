"use client";

import { useSyncExternalStore } from "react";
import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";

function subscribeHydration() {
    return () => {};
}

const getClientHydrated = () => true;
const getServerHydrated = () => false;

function useIsHydrated(): boolean {
    return useSyncExternalStore(subscribeHydration, getClientHydrated, getServerHydrated);
}

export function useHydratedQuery<TData>(
    options: Omit<UseQueryOptions<TData>, "enabled"> & { enabled?: boolean }
): UseQueryResult<TData> {
    const isHydrated = useIsHydrated();
    const isEnabled = isHydrated && (options.enabled ?? true);
    const query = useQuery<TData>({
        ...options,
        enabled: isEnabled,
        refetchInterval: isEnabled ? options.refetchInterval : false,
    });
    return {
        ...query,
        data: isHydrated ? query.data : undefined,
        isLoading: !isHydrated || query.isLoading,
    } as UseQueryResult<TData>;
}
