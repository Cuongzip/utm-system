"use client";

import { WifiOff } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import styles from "./ConnectedDevicesPanel.module.css";

interface ConnectedDevicesPanelProps {
  status?: string;
  onTroubleshootGateway?: () => void;
  onProvisionEdgeAgent?: () => void;
}

export function ConnectedDevicesPanel({
  status = "STANDBY",
  onTroubleshootGateway,
  onProvisionEdgeAgent,
}: ConnectedDevicesPanelProps) {
  return (
    <ChamferCard size="lg" accent="cyan" className="min-h-[365px]">
      <div className="p-5 flex flex-col h-full w-full">
        <div className="flex items-center justify-between pb-3 pl-2 border-b border-[#f1f5f9] w-full">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[12px] font-bold uppercase text-[#1e293b] tracking-[0.6px] leading-4">
              CONNECTED DEVICES
            </h2>
            <p className="text-[12px] text-[#94a3b8] leading-4">
              Currently online devices
            </p>
          </div>

          <div className="flex items-center gap-1.5 pr-2">
            <span className="w-2 h-2 rounded-full bg-[#cbd5e1]" />
            <span className="font-mono text-[11px] text-[#94a3b8] leading-4">
              {status}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-14 flex-1 w-full">
          <div className="pb-3">
            <div className={styles.emptyIconCircle}>
              <WifiOff className="w-7 h-7 text-[#94a3b8]" />
            </div>
          </div>

          <h3 className="text-[14px] font-bold text-[#334155] text-center leading-5">
            No Connected Devices
          </h3>

          <div className="max-w-[384px] pt-1 px-1.5">
            <p className="text-[12px] text-[#94a3b8] text-center leading-4">
              There are no ground or airborne devices broadcasting telemetry to the central gateway right now.
            </p>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onTroubleshootGateway}
              className={styles.actionLink}
            >
              Troubleshoot Gateway
            </button>
            <span className="text-[16px] text-[#cbd5e1]">•</span>
            <button
              type="button"
              onClick={onProvisionEdgeAgent}
              className={styles.actionLink}
            >
              Provision Edge Agent
            </button>
          </div>
        </div>
      </div>
    </ChamferCard>
  );
}

export default ConnectedDevicesPanel;
