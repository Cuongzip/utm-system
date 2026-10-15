"use client";

import { Radio, Wifi, Activity, CheckCircle2 } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import styles from "./ConnectivityMetrics.module.css";

interface ConnectivityMetricsProps {
  totalDevices?: number;
  activeDevices?: number;
  onlineDevices?: number;
  pendingCommands?: number;
  protocolStatusCount?: number;
}

export function ConnectivityMetrics({
  totalDevices = 0,
  activeDevices = 0,
  onlineDevices = 0,
  pendingCommands = 0,
  protocolStatusCount = 0,
}: ConnectivityMetricsProps) {
  const onlinePercent = totalDevices > 0 ? (onlineDevices / totalDevices) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <ChamferCard size="md" accent="cyan" className="h-[119px]">
        <div className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between w-full pl-2">
            <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
              TOTAL DEVICES
            </span>
            <Radio className="w-4 h-4 text-[#64748b]" />
          </div>

          <div className="flex flex-col gap-0.5 pt-3 pl-1">
            <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
              {totalDevices}
            </span>
            <span className="text-[11px] text-[#94a3b8]">
              {activeDevices} active
            </span>
          </div>
        </div>
      </ChamferCard>

      <ChamferCard size="md" accent="cyan" className="h-[119px]">
        <div className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between w-full pl-2">
            <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
              ONLINE
            </span>
            <Wifi className="w-4 h-4 text-[#10b981]" />
          </div>

          <div className="flex flex-col gap-2 pt-3 pl-1">
            <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
              {onlineDevices}
            </span>
            <div className={styles.progressBarTrack}>
              <div
                className={styles.progressBarFill}
                style={{ width: `${onlinePercent}%` }}
              />
            </div>
          </div>
        </div>
      </ChamferCard>

      <ChamferCard size="md" accent="cyan" className="h-[119px]">
        <div className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between w-full pl-2">
            <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
              PENDING COMMANDS
            </span>
            <Activity className="w-4 h-4 text-[#64748b]" />
          </div>

          <div className="flex flex-col gap-0.5 pt-3 pl-1">
            <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
              {pendingCommands}
            </span>
            <span className="text-[11px] text-[#94a3b8]">
              In queue for delivery
            </span>
          </div>
        </div>
      </ChamferCard>

      <ChamferCard size="md" accent="cyan" className="h-[119px]">
        <div className="p-4 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between w-full pl-2">
            <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
              PROTOCOL STATUS
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          </div>

          <div className="flex flex-col gap-0.5 pt-3 pl-1">
            <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
              {protocolStatusCount}
            </span>
            <span className="text-[11px] text-[#94a3b8]">
              WebSocket connections
            </span>
          </div>
        </div>
      </ChamferCard>
    </div>
  );
}

export default ConnectivityMetrics;
