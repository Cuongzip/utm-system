"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui";
import type { Hub, CreateHubPayload, UpdateHubPayload } from "@/types";

interface AddHubModalProps {
  isOpen: boolean;
  hubToEdit?: Hub | null;
  onClose: () => void;
  onSubmit: (
    payload: CreateHubPayload | UpdateHubPayload,
    id?: string
  ) => Promise<void>;
}

export function AddHubModal({
  isOpen,
  hubToEdit,
  onClose,
  onSubmit,
}: AddHubModalProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [airspaceRadius, setAirspaceRadius] = useState("");
  const [altitudeMsl, setAltitudeMsl] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [status, setStatus] = useState("ACTIVE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (hubToEdit) {
        setCode(hubToEdit.code || "");
        setName(hubToEdit.name || "");
        const hubLat = hubToEdit.location?.lat ?? hubToEdit.latitude;
        const hubLng = hubToEdit.location?.lng ?? hubToEdit.longitude;
        setLat(hubLat !== undefined ? String(hubLat) : "");
        setLng(hubLng !== undefined ? String(hubLng) : "");
        setAirspaceRadius(
          hubToEdit.airspaceRadius !== undefined
            ? String(hubToEdit.airspaceRadius)
            : "5000"
        );
        setAltitudeMsl(
          hubToEdit.altitudeMsl !== undefined
            ? String(hubToEdit.altitudeMsl)
            : "400"
        );
        setStatus((hubToEdit.status || "ACTIVE").toUpperCase());
        setTimezone("UTC");
      } else {
        setCode("");
        setName("");
        setLat("");
        setLng("");
        setAirspaceRadius("5000");
        setAltitudeMsl("400");
        setTimezone("UTC");
        setStatus("ACTIVE");
      }
      setError(null);
    }
  }, [isOpen, hubToEdit]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError("Hub Code and Name are required");
      return;
    }

    const latitudeNum = parseFloat(lat);
    const longitudeNum = parseFloat(lng);
    if (isNaN(latitudeNum) || isNaN(longitudeNum)) {
      setError("Valid Latitude and Longitude coordinates are required");
      return;
    }

    const radiusNum = parseFloat(airspaceRadius) || 5000;
    const altitudeNum = parseFloat(altitudeMsl) || 0;

    try {
      setLoading(true);
      setError(null);

      if (hubToEdit) {
        const updatePayload: UpdateHubPayload = {
          name: name.trim(),
          airspaceRadius: radiusNum,
          altitudeMsl: altitudeNum,
          status,
        };
        await onSubmit(updatePayload, hubToEdit.id);
      } else {
        const createPayload: CreateHubPayload = {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          location: {
            lat: latitudeNum,
            lng: longitudeNum,
          },
          altitudeMsl: altitudeNum,
          airspaceRadius: radiusNum,
        };
        await onSubmit(createPayload);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save hub";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={hubToEdit ? "Edit Hub" : "Add Hub"}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      submitText={hubToEdit ? "Save Changes" : "Create Hub"}
      loadingText={hubToEdit ? "Saving..." : "Creating..."}
    >
      <div className="form-group">
        <label className="form-label" htmlFor="hubCode">
          Code *
        </label>
        <input
          id="hubCode"
          type="text"
          required
          disabled={!!hubToEdit}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. HUB-001"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="hubName">
          Name *
        </label>
        <input
          id="hubName"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hub name"
          className="form-input"
        />
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="latitude">
            Latitude *
          </label>
          <input
            id="latitude"
            type="number"
            step="any"
            required
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="e.g. 37.9838"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="longitude">
            Longitude *
          </label>
          <input
            id="longitude"
            type="number"
            step="any"
            required
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="e.g. 23.7275"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="airspaceRadius">
            Radius (m) *
          </label>
          <input
            id="airspaceRadius"
            type="number"
            step="any"
            required
            value={airspaceRadius}
            onChange={(e) => setAirspaceRadius(e.target.value)}
            placeholder="5000"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="altitudeMsl">
            Ceiling / Altitude MSL (m)
          </label>
          <input
            id="altitudeMsl"
            type="number"
            step="any"
            value={altitudeMsl}
            onChange={(e) => setAltitudeMsl(e.target.value)}
            placeholder="400"
            className="form-input"
          />
        </div>
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="timezone">
            Timezone
          </label>
          <input
            id="timezone"
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            placeholder="UTC"
            className="form-input"
          />
        </div>

        {hubToEdit && (
          <div className="form-group">
            <label className="form-label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-select"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default AddHubModal;
