"use client";

import { useState } from "react";
import { Modal } from "@/components/ui";
import type { DeviceRegistrationPayload } from "@/types";

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Drone Device"
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitText="Register Device"
      loadingText="Registering..."
    >
      <div className="form-group">
        <label className="form-label" htmlFor="droneId">
          Drone ID *
        </label>
        <input
          id="droneId"
          type="text"
          required
          value={droneId}
          onChange={(e) => setDroneId(e.target.value)}
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="deviceIdentifier">
          Device Identifier *
        </label>
        <input
          id="deviceIdentifier"
          type="text"
          required
          value={deviceIdentifier}
          onChange={(e) => setDeviceIdentifier(e.target.value)}
          placeholder="e.g. DEV-UTM-0091"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="certificateFingerprint">
          Certificate Fingerprint (Optional)
        </label>
        <input
          id="certificateFingerprint"
          type="text"
          value={certificateFingerprint}
          onChange={(e) => setCertificateFingerprint(e.target.value)}
          placeholder="e.g. SHA256:4a:5b:6c..."
          className="form-input"
        />
      </div>
    </Modal>
  );
}

export default RegisterDeviceModal;
