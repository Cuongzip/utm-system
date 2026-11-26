"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { ChamferCard, ChamferButton } from "@/components/ui";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
    const router = useRouter();

    useEffect(() => {
        console.error("Backoffice segment error caught:", error);
    }, [error]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)] p-4 select-none font-sans">
            <div className="relative z-10 w-full max-w-md">
                <ChamferCard size="lg" className="shadow-xs">
                    <div className="p-8 sm:p-10 flex flex-col items-center text-center">
                        <div className="w-14 h-14 chamfer-sm bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mb-5">
                            <AlertTriangle className="w-7 h-7 stroke-[1.75]" />
                        </div>

                        <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded mb-3 tracking-wider">
                            ERROR 500
                        </span>

                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
                            Something Went Wrong
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                            An unexpected error occurred while rendering this view. Try again or
                            return to the Operations Center.
                        </p>

                        {(error.message || error.digest) && (
                            <div className="w-full bg-slate-50 border border-slate-200 rounded p-3 mb-6 text-left font-mono text-[11px] text-slate-600 space-y-1">
                                {error.digest && (
                                    <div className="flex justify-between gap-2 border-b border-slate-200/80 pb-1">
                                        <span className="text-slate-400">DIGEST:</span>
                                        <span className="text-slate-700 font-semibold truncate">
                                            {error.digest}
                                        </span>
                                    </div>
                                )}
                                {error.message && (
                                    <p className="text-slate-600 break-words leading-relaxed">
                                        {error.message}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                            <ChamferButton size="sm" variant="dark" onClick={() => reset()}>
                                <RotateCw className="w-3.5 h-3.5" />
                                <span>Try Again</span>
                            </ChamferButton>

                            <ChamferButton
                                size="sm"
                                variant="outline"
                                clip="xs"
                                onClick={() => router.push("/dashboard")}
                            >
                                <Home className="w-3.5 h-3.5" />
                                <span>Back to Dashboard</span>
                            </ChamferButton>
                        </div>
                    </div>
                </ChamferCard>
            </div>
        </div>
    );
}
