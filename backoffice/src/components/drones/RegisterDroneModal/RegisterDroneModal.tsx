"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { ChamferCard } from "@/components/ui";
import { hubService } from "@/services/hubService";
import type { Drone, DroneRegistrationPayload, Hub } from "@/types";
import styles from "./RegisterDroneModal.module.css";

interface RegisterDroneModalProps {
  isOpen: boolean;
  droneToEdit?: Drone | null;
  onClose: () => void;
  onSubmit: (payload: DroneRegistrationPayload, id?: string) => Promise<void>;
}

export function RegisterDroneModal({
  isOpen,
  droneToEdit,
  onClose,
  onSubmit,
}: RegisterDroneModalProps) {
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [homeHubId, setHomeHubId] = useState("");
  const [communicationProtocol, setCommunicationProtocol] = useState("");
  const [batteryCapacityWh, setBatteryCapacityWh] = useState("");
  const [hoverPowerW, setHoverPowerW] = useState("");
  const [cruisePowerW, setCruisePowerW] = useState("");
  const [cruiseSpeedMs, setCruiseSpeedMs] = useState("");
  const [batteryHealthPct, setBatteryHealthPct] = useState("");
  const [windToleranceMs, setWindToleranceMs] = useState("");
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      hubService
        .getAll()
        .then((items) => {
          setHubs(items || []);
        })
        .catch(() => {});

      if (droneToEdit) {
        setRegistrationNumber(droneToEdit.registrationNumber || droneToEdit.id || "");
        setManufacturer(droneToEdit.manufacturer || "");
        setModel(droneToEdit.model || "");
        setSerialNumber(droneToEdit.serialNumber || "");
        setHomeHubId(droneToEdit.homeHubId || droneToEdit.homeHub?.id || "");
        setBatteryCapacityWh(
          droneToEdit.batteryCapacityWh ? String(droneToEdit.batteryCapacityWh) : ""
        );
      } else {
        setRegistrationNumber("");
        setManufacturer("");
        setModel("");
        setSerialNumber("");
        setHomeHubId("");
        setCommunicationProtocol("");
        setBatteryCapacityWh("");
        setHoverPowerW("");
        setCruisePowerW("");
        setCruiseSpeedMs("");
        setBatteryHealthPct("");
        setWindToleranceMs("");
      }
      setError(null);
    }
  }, [isOpen, droneToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim() || !manufacturer.trim() || !model.trim()) {
      setError("Registration number, manufacturer and model are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(
        {
          registrationNumber: registrationNumber.trim(),
          manufacturer: manufacturer.trim(),
          model: model.trim(),
          serialNumber: serialNumber.trim() || undefined,
          homeHubId: homeHubId ? homeHubId.trim() : undefined,
          communicationProtocol: communicationProtocol || undefined,
          batteryCapacityWh: batteryCapacityWh ? parseFloat(batteryCapacityWh) : 300,
          hoverPowerW: hoverPowerW ? parseFloat(hoverPowerW) : undefined,
          cruisePowerW: cruisePowerW ? parseFloat(cruisePowerW) : undefined,
          cruiseSpeedMs: cruiseSpeedMs ? parseFloat(cruiseSpeedMs) : undefined,
          batteryHealthPct: batteryHealthPct ? parseFloat(batteryHealthPct) : undefined,
          windToleranceMs: windToleranceMs ? parseFloat(windToleranceMs) : undefined,
          status: droneToEdit?.status || "AVAILABLE",
        },
        droneToEdit?.id
      );
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register drone";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <ChamferCard size="lg" accent="cyan" className="w-full">
          <div className={styles.modalHeader}>
            <div className={styles.headerText}>
              <h3 className={styles.title}>
                {droneToEdit ? "Edit Drone" : "Register Drone"}
              </h3>
              <p className={styles.subtitle}>
                Fill in the details to register a new drone.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {error}
              </div>
            )}

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="registrationNumber">
                Registration Number
              </label>
              <input
                id="registrationNumber"
                type="text"
                required
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. DRN-001"
                className={styles.input}
              />
            </div>

            <div className={styles.twoCols}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="manufacturer">
                  Manufacturer
                </label>
                <input
                  id="manufacturer"
                  type="text"
                  required
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="e.g. DJI"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="model">
                  Model
                </label>
                <input
                  id="model"
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Matrice 300 RTK"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="serialNumber">
                Serial Number
              </label>
              <input
                id="serialNumber"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. SN-12345678"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="homeHub">
                Home Hub
              </label>
              <select
                id="homeHub"
                value={homeHubId}
                onChange={(e) => setHomeHubId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a hub</option>
                {hubs.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.code ? `(${h.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="communicationProtocol">
                Communication Protocol
              </label>
              <select
                id="communicationProtocol"
                value={communicationProtocol}
                onChange={(e) => setCommunicationProtocol(e.target.value)}
                className={styles.select}
              >
                <option value="">Select protocol</option>
                <option value="MAVLink">MAVLink</option>
                <option value="Cellular 4G/5G">Cellular 4G/5G</option>
                <option value="Direct RF">Direct RF</option>
                <option value="Satellite">Satellite</option>
              </select>
            </div>

            <div className={styles.sectionTitle}>
              Energy &amp; Performance
            </div>

            <div className={styles.twoCols}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="batteryCapacityWh">
                  Battery capacity (Wh)
                </label>
                <input
                  id="batteryCapacityWh"
                  type="number"
                  step="any"
                  value={batteryCapacityWh}
                  onChange={(e) => setBatteryCapacityWh(e.target.value)}
                  placeholder="e.g. 300"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="hoverPowerW">
                  Hover power (W)
                </label>
                <input
                  id="hoverPowerW"
                  type="number"
                  step="any"
                  value={hoverPowerW}
                  onChange={(e) => setHoverPowerW(e.target.value)}
                  placeholder="e.g. 800"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.twoCols}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="cruisePowerW">
                  Cruise power (W)
                </label>
                <input
                  id="cruisePowerW"
                  type="number"
                  step="any"
                  value={cruisePowerW}
                  onChange={(e) => setCruisePowerW(e.target.value)}
                  placeholder="e.g. 500"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="cruiseSpeedMs">
                  Cruise speed (m/s)
                </label>
                <input
                  id="cruiseSpeedMs"
                  type="number"
                  step="any"
                  value={cruiseSpeedMs}
                  onChange={(e) => setCruiseSpeedMs(e.target.value)}
                  placeholder="e.g. 15"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.twoCols}>
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="batteryHealthPct">
                  Battery health (%)
                </label>
                <input
                  id="batteryHealthPct"
                  type="number"
                  step="any"
                  value={batteryHealthPct}
                  onChange={(e) => setBatteryHealthPct(e.target.value)}
                  placeholder="e.g. 95"
                  className={styles.input}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="windToleranceMs">
                  Wind tolerance (m/s)
                </label>
                <input
                  id="windToleranceMs"
                  type="number"
                  step="any"
                  value={windToleranceMs}
                  onChange={(e) => setWindToleranceMs(e.target.value)}
                  placeholder="e.g. 12"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className={styles.cancelBtn}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={styles.submitBtn}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{droneToEdit ? "Save Changes" : "Register Drone"}</span>
                )}
              </button>
            </div>
          </form>
        </ChamferCard>
      </div>
    </div>
  );
}

export default RegisterDroneModal;
