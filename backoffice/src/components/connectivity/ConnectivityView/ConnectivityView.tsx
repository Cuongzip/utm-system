"use client";

import { useState } from "react";
import ConnectivityHeader from "../ConnectivityHeader";
import ConnectivityAlert from "../ConnectivityAlert";
import ConnectivityMetrics from "../ConnectivityMetrics";
import ConnectivityTabs, { ConnectivitySubTab } from "../ConnectivityTabs";
import TelemetryDistribution from "../TelemetryDistribution";
import CommandQueue from "../CommandQueue";
import ConnectedDevicesPanel from "../ConnectedDevicesPanel";
import styles from "./ConnectivityView.module.css";

export function ConnectivityView() {
  const [activeSubTab, setActiveSubTab] = useState<ConnectivitySubTab>("overview");

  return (
    <div className={styles.container}>
      <ConnectivityHeader />

      <ConnectivityAlert message="Failed to fetch devices" />

      <ConnectivityMetrics
        totalDevices={0}
        activeDevices={0}
        onlineDevices={0}
        pendingCommands={0}
        protocolStatusCount={0}
      />

      <ConnectivityTabs
        activeTab={activeSubTab}
        onTabChange={(tab) => setActiveSubTab(tab)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <TelemetryDistribution
          frequencyBand="DUAL-BAND"
          hasFeeds={false}
        />
        <CommandQueue
          latency="0ms"
          pendingCount={0}
        />
      </div>

      <ConnectedDevicesPanel status="STANDBY" />
    </div>
  );
}

export default ConnectivityView;
