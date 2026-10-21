"use client";

import { PageHeader } from "@/components/ui";
import { Building2, Navigation, Radio } from "lucide-react";
import {
  TacticalMapPanel,
  LiveTelemetry,
  FlightControl,
  RecentCommands,
  ActiveAlerts,
} from "@/components/control-center";

export default function ControlCenterPage() {
  return (
    <div className="p-8 space-y-6">
      <PageHeader title="Live Operations">
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600 font-medium">
            <Building2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
            5 HUBS
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-300 bg-slate-100 text-slate-900 font-semibold">
            <Navigation className="h-3.5 w-3.5 mr-1 text-slate-700 rotate-45" />
            4 ACTIVE
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600 font-medium">
            <Radio className="h-3.5 w-3.5 mr-1 text-slate-500" />
            26 ADS-B
          </span>
        </div>
      </PageHeader>

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
  );
}
