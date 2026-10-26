"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { showApiError } from "@/utils";

declare module "@tanstack/react-query" {
    interface Register {
        mutationMeta: {
            suppressGlobalToast?: boolean;
            defaultErrorMessage?: string;
        };
    }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                mutationCache: new MutationCache({
                    onError: (error, _variables, _context, mutation) => {
                        const meta = mutation.options.meta as
                            | {
                                  suppressGlobalToast?: boolean;
                                  defaultErrorMessage?: string;
                              }
                            | undefined;

                        if (meta?.suppressGlobalToast) {
                            return;
                        }

                        const defaultMsg = meta?.defaultErrorMessage || "Action failed";
                        showApiError(error, defaultMsg);
                    },
                }),
                defaultOptions: {
                    queries: {
                        staleTime: 1000 * 30, // 30s cache
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
