import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div
            role="status"
            aria-busy="true"
            aria-label="Loading UTM Backoffice"
            className="flex min-h-screen w-full bg-[var(--color-surface-base)]"
        >
            <div className="hidden lg:flex w-60 shrink-0 border-r border-slate-200 bg-white p-5 flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="flex flex-col gap-2.5">
                    {Array.from({ length: 10 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-8 w-full rounded-md" />
                    ))}
                </div>
            </div>

            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-9 w-28" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="h-[119px] rounded-md border border-slate-200 bg-white p-4 flex flex-col justify-between"
                        >
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-7 w-16" />
                        </div>
                    ))}
                </div>
                <div className="rounded-md border border-slate-200 bg-white p-5 flex flex-col gap-3 flex-1 min-h-[320px]">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-10 w-full" />
                    ))}
                </div>
            </div>
            <span className="sr-only">Loading UTM Backoffice...</span>
        </div>
    );
}
