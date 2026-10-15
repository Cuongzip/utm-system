"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Sidebar, { SidebarTabId } from "@/components/layout/Sidebar";
import {
  TacticalMapPanel,
  LiveTelemetry,
  FlightControl,
  RecentCommands,
  ActiveAlerts,
} from "@/components/control-center";
import { ConnectivityView } from "@/components/connectivity";
import { Sliders, Construction } from "lucide-react";

const TAB_TITLES: Record<SidebarTabId, string> = {
  dashboard: "Dashboard Overview",
  "control-center": "Live Operations",
  emergency: "Emergency Protocols",
  fleet: "Fleet Management",
  connectivity: "Device Connectivity",
  missions: "Missions Operations",
  flights: "Flights Management",
  drones: "Drones Management",
  hubs: "Operations Hubs",
  airspace: "Airspace Sectors",
  conflicts: "Conflict Detection",
  weather: "Weather Services",
  developer: "Developer Console",
  settings: "System Settings",
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<SidebarTabId>("connectivity");
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={`min-h-screen flex font-sans antialiased overflow-x-hidden ${isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-[#f8fafc] text-slate-800"}`}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-y-auto">
        {activeTab === "control-center" && (
          <Header
            activeViewTitle={TAB_TITLES[activeTab] || "Live Operations"}
            userInitials="CU"
          />
        )}

        {activeTab === "control-center" ? (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8">
                <TacticalMapPanel initialMode="globe" />
              </div>

              <div className="lg:col-span-4">
                <LiveTelemetry />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FlightControl uavId="UAV-008" statusText="Ready for control" />
              <RecentCommands />
              <ActiveAlerts />
            </div>
          </div>
        ) : activeTab === "connectivity" ? (
          <ConnectivityView />
        ) : (
          <div className="p-6 space-y-6">
            <Header
              activeViewTitle={TAB_TITLES[activeTab] || "UTM System"}
              userInitials="CU"
            />
            <div className="octa-border-wrapper-lg tech-mark-tl-br min-h-[500px]">
              <div className="octa-lg bg-white p-12 flex flex-col items-center justify-center text-center h-full">
                <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-600 mb-4 shadow-xs">
                  <Construction className="h-6 w-6 text-slate-600 animate-bounce" />
                </div>
                <h2 className="text-base font-bold font-mono text-slate-800">
                  {TAB_TITLES[activeTab]} (Giao diện đang hoàn thiện)
                </h2>
                <p className="mt-2 max-w-md text-xs text-slate-500 font-mono">
                  Chỉ làm UI mẫu theo yêu cầu. Nhấn{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("control-center")}
                    className="font-bold text-slate-800 underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="h-3 w-3" /> Control Center
                  </button>{" "}
                  để xem bản đồ điều hành 2D/3D Globe và telemetry.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
