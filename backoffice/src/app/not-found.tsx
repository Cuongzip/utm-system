"use client";

import Link from "next/link";
import { ArrowLeft, Home, Compass } from "lucide-react";
import { ChamferCard, ChamferButton, OutlineButton } from "@/components/ui";

export default function NotFound() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)] p-4 select-none font-sans">
            <div className="relative z-10 w-full max-w-md">
                <ChamferCard size="lg" className="shadow-xs">
                    <div className="p-8 sm:p-10 flex flex-col items-center text-center">
                        <div className="w-14 h-14 chamfer-sm bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-5">
                            <Compass className="w-7 h-7 stroke-[1.75]" />
                        </div>

                        <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded mb-3 tracking-wider">
                            ERROR 404
                        </span>

                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
                            Page Not Found
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-8 leading-relaxed">
                            The coordinate or page you are looking for does not exist or has been
                            moved within the UTM system.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                            <Link href="/dashboard">
                                <ChamferButton size="sm" variant="dark" className="px-4 font-bold">
                                    <Home className="w-3.5 h-3.5 mr-1" />
                                    Back to Dashboard
                                </ChamferButton>
                            </Link>
                            <OutlineButton size="sm" onClick={() => window.history.back()}>
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                                Go Back
                            </OutlineButton>
                        </div>
                    </div>
                </ChamferCard>
            </div>
        </div>
    );
}
