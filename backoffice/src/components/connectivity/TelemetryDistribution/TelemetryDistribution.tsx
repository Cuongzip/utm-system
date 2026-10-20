"use client";

import { PieChart } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import styles from "./TelemetryDistribution.module.css";

interface TelemetryDistributionProps {
  frequencyBand?: string;
  hasFeeds?: boolean;
  byMode?: Record<string, number>;
}

export function TelemetryDistribution({
  frequencyBand = "DUAL-BAND",
  hasFeeds = false,
  byMode = { idle: 0, normal: 0, enhanced: 0, emergency: 0 },
}: TelemetryDistributionProps) {
  const totalFeeds = Object.values(byMode).reduce((sum, v) => sum + v, 0);
  const showActive = hasFeeds || totalFeeds > 0;

  return (
    <ChamferCard size="lg" accent="cyan" className="h-[222px]">
      <div className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between w-full pl-2">
          <h2 className="text-[12px] font-bold uppercase text-[#1e293b] tracking-[0.6px] leading-4">
            TELEMETRY DISTRIBUTION
          </h2>
          <span className="font-mono text-[10px] text-[#94a3b8] leading-[15px]">
            FREQ: {frequencyBand}
          </span>
        </div>

        <div className="pt-3 w-full">
          {!showActive ? (
            <div className={styles.emptyBox}>
              <div className="flex items-center justify-center size-8 mb-2">
                <PieChart className="w-8 h-8 text-[#cbd5e1] stroke-[1.5]" />
              </div>
              <span className="text-[12px] text-[#94a3b8] leading-4">
                No active telemetry feeds recorded
              </span>
            </div>
          ) : (
            <div className={styles.modeGrid}>
              <div className={styles.modeCard}>
                <span className={styles.modeLabel}>Idle (1 Hz)</span>
                <span className={styles.modeValue}>{byMode.idle || 0}</span>
              </div>
              <div className={styles.modeCard}>
                <span className={styles.modeLabel}>Normal (5 Hz)</span>
                <span className={styles.modeValue}>{byMode.normal || 0}</span>
              </div>
              <div className={styles.modeCard}>
                <span className={styles.modeLabel}>Enhanced (20 Hz)</span>
                <span className={styles.modeValue}>{byMode.enhanced || 0}</span>
              </div>
              <div className={styles.modeCard}>
                <span className={styles.modeLabel}>Emergency (50 Hz)</span>
                <span className={styles.modeValue}>{byMode.emergency || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </ChamferCard>
  );
}

export default TelemetryDistribution;
