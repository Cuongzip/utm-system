"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { ChamferCard, ChamferButton } from "@/components/ui";
import type { DeviceRegistrationPayload } from "@/types";
import styles from "./RegisterDeviceModal.module.css";

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: DeviceRegistrationPayload) => Promise<void>;
}

export function RegisterDeviceModal({
  isOpen,
  onClose,
  onSubmit,
}: RegisterDeviceModalProps) {
  const [droneId, setDroneId] = useState("");
  const [deviceIdentifier, setDeviceIdentifier] = useState("");
  const [certificateFingerprint, setCertificateFingerprint] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!droneId.trim() || !deviceIdentifier.trim()) {
      setError("Drone ID and Device Identifier are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit({
        droneId: droneId.trim(),
        deviceIdentifier: deviceIdentifier.trim(),
        certificateFingerprint: certificateFingerprint.trim() || undefined,
      });
      setDroneId("");
      setDeviceIdentifier("");
      setCertificateFingerprint("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register device";
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
            <h3 className={styles.title}>Register Drone Device</h3>
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
              <label className={styles.label} htmlFor="droneId">
                Drone ID *
              </label>
              <input
                id="droneId"
                type="text"
                required
                value={droneId}
                onChange={(e) => setDroneId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="deviceIdentifier">
                Device Identifier *
              </label>
              <input
                id="deviceIdentifier"
                type="text"
                required
                value={deviceIdentifier}
                onChange={(e) => setDeviceIdentifier(e.target.value)}
                placeholder="e.g. DEV-UTM-0091"
                className={styles.input}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="certificateFingerprint">
                Certificate Fingerprint (Optional)
              </label>
              <input
                id="certificateFingerprint"
                type="text"
                value={certificateFingerprint}
                onChange={(e) => setCertificateFingerprint(e.target.value)}
                placeholder="e.g. SHA256:4a:5b:6c..."
                className={styles.input}
              />
            </div>

            <div className={styles.actions}>
              <ChamferButton
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={loading}
                className="border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
              >
                Cancel
              </ChamferButton>
              <ChamferButton variant="dark" size="sm" type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Register Device</span>
                )}
              </ChamferButton>
            </div>
          </form>
        </ChamferCard>
      </div>
    </div>
  );
}

export default RegisterDeviceModal;
