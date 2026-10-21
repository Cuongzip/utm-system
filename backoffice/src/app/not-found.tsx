"use client";

import Link from "next/link";
import { ChamferCard, ChamferButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[var(--color-tactical-bg)] text-slate-100 p-4 relative overflow-hidden select-none font-sans">
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(0, 163, 191, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 163, 191, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px"
        }}
      />

      <div className="absolute w-[500px] h-[500px] rounded-full border border-cyan-500/10 pointer-events-none animate-pulse" />
      <div className="absolute w-[800px] h-[800px] rounded-full border border-cyan-500/5 pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl">
        <ChamferCard size="lg" accent="cyan" innerClassName="bg-[#0b121c] p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#00A3BF]/40 flex items-center justify-center mb-6 relative">
              <div className="w-12 h-12 rounded-full border border-red-500/40 flex items-center justify-center animate-ping opacity-75" />
              <svg
                className="w-8 h-8 text-cyan-400 absolute"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold tracking-widest uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              STATUS: 404 // RADAR_TARGET_NOT_FOUND
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase mb-2">
              Không Tìm Thấy Tọa Độ Phân Hệ
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
              Tọa độ không phận hoặc phân hệ bạn yêu cầu không nằm trong hải trình hệ thống UTM. Thiết bị hoặc tài nguyên này có thể đã bị di dời hoặc tạm ngắt kết nối.
            </p>

            <div className="w-full bg-[#060a10] border border-cyan-500/20 rounded p-3 mb-6 text-left font-mono text-[11px] text-slate-400 space-y-1.5">
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-500">SECTOR_STATUS:</span>
                <span className="text-amber-400">OUT_OF_RADAR_COVERAGE</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-1">
                <span className="text-slate-500">TRANSPONDER:</span>
                <span className="text-red-400">NO_SIGNAL_RECEIVED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ESTIMATED_COORDINATES:</span>
                <span className="text-cyan-400">00°00&apos;00&quot;N 00°00&apos;00&quot;E</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 w-full">
              <Link href="/">
                <ChamferButton size="md" variant="dark" className="px-6 font-bold">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  VỀ TRUNG TÂM CHỈ HUY
                </ChamferButton>
              </Link>
              <ChamferButton
                size="md"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800/60"
                onClick={() => window.location.reload()}
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                QUÉT LẠI TÍN HIỆU
              </ChamferButton>
            </div>
          </div>
        </ChamferCard>
      </div>
    </div>
  );
}
