"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const CesiumMap = dynamic(() => import("@/components/CesiumMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[650px] w-full items-center justify-center rounded-xl bg-zinc-950 text-white border border-zinc-800">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
        <span className="text-sm font-medium text-zinc-400">Đang tải bản đồ 3D Globe...</span>
      </div>
    </div>
  ),
});

const Map2D = dynamic(() => import("@/components/Map2D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[650px] w-full items-center justify-center rounded-xl bg-zinc-950 text-white border border-zinc-800">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
        <span className="text-sm font-medium text-zinc-400">Đang tải bản đồ 2D Flat Map...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  const [activeTab, setActiveTab] = useState<"3d" | "2d" | "split">("3d");

  return (
    <div className="flex min-h-screen flex-col bg-zinc-900 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/90 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
              UTM
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-white">
                UTM Backoffice - Hệ Thống Giám Sát Bản Đồ Không Gian
              </h1>
              <p className="text-xs text-zinc-400">
                Hỗ trợ trực quan hóa không gian 3D & Bản đồ phẳng 2D phục vụ điều hành bay (UTM)
              </p>
            </div>
          </div>

          <div className="flex items-center rounded-lg bg-zinc-900 p-1 border border-zinc-800">
            <button
              onClick={() => setActiveTab("3d")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "3d"
                  ? "bg-sky-500 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>🌍</span>
              <span>Bản đồ 3D</span>
            </button>
            <button
              onClick={() => setActiveTab("2d")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "2d"
                  ? "bg-amber-500 text-black font-semibold shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>🗺️</span>
              <span>Bản đồ 2D</span>
            </button>
            <button
              onClick={() => setActiveTab("split")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === "split"
                  ? "bg-indigo-500 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span>🔲</span>
              <span>Song song (3D & 2D)</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-zinc-100">
                {activeTab === "3d" && "Bản đồ không gian số 3D (3D Globe)"}
                {activeTab === "2d" && "Bản đồ phẳng 2D (2D Flat Tactical Map)"}
                {activeTab === "split" && "Hiển thị đồng thời: Bản đồ 3D Globe & Bản đồ 2D"}
              </h2>
              <p className="text-sm text-zinc-400">
                {activeTab === "3d" && "Mô phỏng địa cầu 3D với ảnh vệ tinh phân giải cao, hỗ trợ quản lý độ cao bay và địa hình."}
                {activeTab === "2d" && "Bản đồ phẳng 2D thể hiện chi tiết mạng lưới đường phố, địa danh, hỗ trợ giám sát không phận."}
                {activeTab === "split" && "So sánh trực quan giữa góc nhìn địa hình 3D toàn cảnh và bản đồ 2D đường xá."}
              </p>
            </div>
          </div>

          {activeTab === "3d" && <CesiumMap height="680px" />}

          {activeTab === "2d" && <Map2D height="680px" />}

          {activeTab === "split" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                    Góc nhìn 3D Globe
                  </span>
                </div>
                <CesiumMap height="620px" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Góc nhìn 2D Flat Map
                  </span>
                </div>
                <Map2D height="620px" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
