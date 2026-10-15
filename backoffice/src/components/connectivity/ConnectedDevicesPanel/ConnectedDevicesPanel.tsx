"use client";

import { WifiOff, Activity, Trash2, Loader2 } from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";
import type { DeviceRegistration } from "@/types";
import styles from "./ConnectedDevicesPanel.module.css";

interface ConnectedDevicesPanelProps {
  status?: string;
  devices?: DeviceRegistration[];
  loading?: boolean;
  onHeartbeat?: (id: string) => void;
  onRevoke?: (id: string) => void;
  onTroubleshootGateway?: () => void;
  onProvisionEdgeAgent?: () => void;
}

export function ConnectedDevicesPanel({
  status = "STANDBY",
  devices = [],
  loading = false,
  onHeartbeat,
  onRevoke,
  onTroubleshootGateway,
  onProvisionEdgeAgent,
}: ConnectedDevicesPanelProps) {
  const isOnline = (item: DeviceRegistration) => item.connectionStatus === "online";

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
            <span
              className={`w-2 h-2 rounded-full ${
                devices.length > 0 ? "bg-[#10b981]" : "bg-[#cbd5e1]"
              }`}
            />
            <span className="font-mono text-[11px] text-[#94a3b8] leading-4">
              {status}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 flex-1 w-full">
            <Loader2 className="w-8 h-8 text-[#00A3BF] animate-spin mb-3" />
            <p className="text-[13px] text-[#64748b]">Loading connected devices...</p>
          </div>
        ) : devices.length === 0 ? (
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
        ) : (
          <div className={`${styles.tableWrapper} pt-2`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Device Identifier</th>
                  <th className={styles.th}>Drone ID / Model</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Socket ID</th>
                  <th className={styles.th}>Last Seen</th>
                  <th className={`${styles.th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={device.id} className={styles.row}>
                    <td className={`${styles.td} font-mono font-bold text-[#0f172a]`}>
                      {device.deviceIdentifier}
                    </td>
                    <td className={styles.td}>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#1e293b]">
                          {device.droneRegistrationNumber || device.droneId.substring(0, 8)}
                        </span>
                        {device.droneModel && (
                          <span className="text-[11px] text-[#94a3b8]">{device.droneModel}</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <StatusBadge
                        status={isOnline(device) ? "online" : device.connectionStatus}
                        label={device.connectionStatus.toUpperCase()}
                      />
                    </td>
                    <td className={`${styles.td} font-mono text-[11px] text-[#64748b]`}>
                      {device.socketId || "—"}
                    </td>
                    <td className={`${styles.td} text-[12px] text-[#64748b]`}>
                      {device.lastSeenAt
                        ? new Date(device.lastSeenAt).toLocaleTimeString()
                        : "Never"}
                    </td>
                    <td className={`${styles.td} text-right`}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onHeartbeat?.(device.id)}
                          title="Ping Heartbeat"
                          className={styles.iconBtn}
                        >
                          <Activity className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRevoke?.(device.id)}
                          title="Revoke Device"
                          className={styles.dangerBtn}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ChamferCard>
  );
}

export default ConnectedDevicesPanel;
