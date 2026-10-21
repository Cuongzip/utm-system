"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChamferCard, ChamferButton } from "@/components/ui";

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("Backoffice segment error caught:", error);
    }, [error]);

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-tactical-bg)] text-slate-100 p-4 relative overflow-hidden select-none font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage: `
            linear-gradient(to right, rgba(239, 68, 68, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(239, 68, 68, 0.15) 1px, transparent 1px)
          `,
                    backgroundSize: "40px 40px",
                }}
            />

            <div className="absolute w-[500px] h-[500px] rounded-full border border-red-500/10 pointer-events-none animate-pulse" />

            <div className="relative z-10 w-full max-w-xl">
                <ChamferCard size="lg" accent="red" innerClassName="bg-[#120a0d] p-6 sm:p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-red-500/50 flex items-center justify-center mb-6 relative">
                            <div className="w-14 h-14 rounded-full bg-red-950/60 flex items-center justify-center animate-pulse" />
                            <svg
                                className="w-8 h-8 text-red-500 absolute"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            </svg>
                        </div>

                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-950/80 border border-red-500/40 text-red-400 text-xs font-mono font-bold tracking-widest uppercase mb-3">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            ALERT: 500 // CRITICAL_SYSTEM_ANOMALY
                        </div>

                        <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase mb-2">
                            Sự Cố Phân Hệ Vận Hành
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
                            Phát hiện lỗi bất thường trong quá trình điều phối dữ liệu hoặc phân
                            đoạn hiển thị. Hệ thống đã cách ly lỗi để bảo toàn an toàn các luồng dữ
                            liệu khác.
                        </p>

                        <div className="w-full bg-[#0a0507] border border-red-500/30 rounded p-3 mb-6 text-left font-mono text-[11px] text-slate-300 space-y-1.5">
                            <div className="flex justify-between border-b border-red-900/40 pb-1">
                                <span className="text-slate-400">FAULT_TYPE:</span>
                                <span className="text-red-400 font-bold">
                                    {error.name || "RuntimeError"}
                                </span>
                            </div>
                            {error.digest && (
                                <div className="flex justify-between border-b border-red-900/40 pb-1">
                                    <span className="text-slate-400">DIGEST_HASH:</span>
                                    <span className="text-amber-400">{error.digest}</span>
                                </div>
                            )}
                            <div className="pt-1">
                                <span className="text-slate-400 block mb-1">EXCEPTION_DETAIL:</span>
                                <p className="text-red-300/90 break-words bg-black/40 p-2 rounded border border-red-950">
                                    {error.message ||
                                        "An unexpected error occurred during segment rendering."}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                            <ChamferButton
                                size="md"
                                variant="dark"
                                className="bg-red-600 hover:bg-red-500 text-white font-extrabold px-6"
                                onClick={() => reset()}
                            >
                                <svg
                                    className="w-4 h-4 mr-1.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                KHỞI ĐỘNG LẠI PHÂN HỆ
                            </ChamferButton>

                            <Link href="/">
                                <ChamferButton
                                    size="md"
                                    variant="outline"
                                    className="border-slate-700 text-slate-300 hover:bg-slate-800/60"
                                >
                                    <svg
                                        className="w-4 h-4 mr-1.5"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                        />
                                    </svg>
                                    VỀ TRANG CHỦ
                                </ChamferButton>
                            </Link>
                        </div>
                    </div>
                </ChamferCard>
            </div>
        </div>
    );
}
