"use client";

import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Bot, Loader2 } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import type { Drone } from "@/types";
import styles from "./DronesTable.module.css";

interface DronesTableProps {
  drones: Drone[];
  loading?: boolean;
  onEditDrone?: (drone: Drone) => void;
  onSelectDrone?: (drone: Drone) => void;
  onDeleteDrone?: (id: string) => void;
}

export function DronesTable({
  drones = [],
  loading = false,
  onEditDrone,
  onSelectDrone,
  onDeleteDrone,
}: DronesTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleEdit = (drone: Drone) => {
    setOpenMenuId(null);
    if (onEditDrone) {
      onEditDrone(drone);
    } else if (onSelectDrone) {
      onSelectDrone(drone);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderStatusBadge = (status: string | undefined) => {
    const s = (status || "AVAILABLE").toUpperCase();
    switch (s) {
      case "AVAILABLE":
        return <span className={styles.badgeAvailable}>AVAILABLE</span>;
      case "IN_FLIGHT":
        return <span className={styles.badgeInFlight}>IN FLIGHT</span>;
      case "CHARGING":
        return <span className={styles.badgeCharging}>CHARGING</span>;
      case "MAINTENANCE":
        return <span className={styles.badgeMaintenance}>MAINTENANCE</span>;
      default:
        return <span className={styles.badgeOffline}>{s}</span>;
    }
  };

  return (
    <div className={styles.container}>
      <ChamferCard size="lg" accent="cyan" className="w-full">
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>REGISTRATION</th>
                <th className={styles.th}>MANUFACTURER</th>
                <th className={styles.th}>MODEL</th>
                <th className={styles.th}>HOME HUB</th>
                <th className={styles.th}>STATUS</th>
                <th className={styles.th}>FLIGHT HOURS</th>
                <th className={styles.th} style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.emptyTd}>
                    <div className={styles.emptyWrapper}>
                      <Loader2 className="w-6 h-6 text-[var(--color-tech-cyan)] animate-spin mb-2" />
                      <span>Loading drone fleet...</span>
                    </div>
                  </td>
                </tr>
              ) : drones.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.emptyTd}>
                    <div className={styles.emptyWrapper}>
                      <Bot className="w-8 h-8 text-[var(--color-border-strong)] mb-1" />
                      <span className="font-semibold text-[var(--color-text-primary)]">No drones found</span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        Register a drone to begin fleet operations.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                drones.map((drone) => (
                  <tr key={drone.id} className={styles.row}>
                    <td className={styles.td}>
                      <span className={styles.registrationText}>
                        {drone.registrationNumber || drone.serialNumber || drone.id}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.manufacturerText}>
                        {drone.manufacturer || "Unknown"}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.modelText}>{drone.model}</span>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.homeHubText}>
                        {drone.homeHub?.name
                          ? `${drone.homeHub.name} (${drone.homeHub.code})`
                          : drone.homeHubName || drone.homeHubId || "Unassigned"}
                      </span>
                    </td>
                    <td className={styles.td}>{renderStatusBadge(drone.status)}</td>
                    <td className={styles.td}>
                      <span className={styles.flightHoursText}>
                        {drone.flightHours !== undefined ? drone.flightHours : 0}
                      </span>
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <div className="relative inline-block text-left" ref={openMenuId === drone.id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuId(openMenuId === drone.id ? null : drone.id)
                          }
                          className={styles.actionBtn}
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {openMenuId === drone.id && (
                          <div className={styles.menuDropdown}>
                            <button
                              type="button"
                              onClick={() => handleEdit(drone)}
                              className={styles.menuItem}
                            >
                              Edit
                            </button>
                            {onDeleteDrone && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  onDeleteDrone(drone.id);
                                }}
                                className={styles.menuItemDanger}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ChamferCard>
    </div>
  );
}

export default DronesTable;
