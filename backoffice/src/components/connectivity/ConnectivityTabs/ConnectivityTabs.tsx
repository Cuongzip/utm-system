"use client";

import styles from "./ConnectivityTabs.module.css";

export type ConnectivitySubTab = "overview" | "devices" | "telemetry-modes";

interface ConnectivityTabsProps {
    activeTab: ConnectivitySubTab;
    onTabChange: (tab: ConnectivitySubTab) => void;
}

export function ConnectivityTabs({ activeTab, onTabChange }: ConnectivityTabsProps) {
    return (
        <div className={styles.tabContainer}>
            <button
                type="button"
                onClick={() => onTabChange("overview")}
                className={activeTab === "overview" ? styles.activeTab : styles.inactiveTab}
            >
                Overview
            </button>

            <button
                type="button"
                onClick={() => onTabChange("devices")}
                className={activeTab === "devices" ? styles.activeTab : styles.inactiveTab}
            >
                Devices
            </button>

            <button
                type="button"
                onClick={() => onTabChange("telemetry-modes")}
                className={activeTab === "telemetry-modes" ? styles.activeTab : styles.inactiveTab}
            >
                Telemetry Modes
            </button>
        </div>
    );
}

export default ConnectivityTabs;
