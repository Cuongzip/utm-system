"use client";

import { useState, useEffect, useCallback } from "react";
import { ChamferButton, PageHeader } from "@/components/ui";
import { Plus } from "lucide-react";
import { DronesTable, RegisterDroneModal } from "@/components/drones";
import { droneService } from "@/services/droneService";
import type { Drone, DroneRegistrationPayload } from "@/types";

export default function DronesPage() {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);

  const fetchDrones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await droneService.getDrones();
      setDrones(res.items || []);
      setError(null);
    } catch {
      setError("Failed to fetch drone fleet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrones();
  }, [fetchDrones]);

  const handleSaveDrone = async (payload: DroneRegistrationPayload, id?: string) => {
    if (id) {
      await droneService.updateDrone(id, payload);
    } else {
      await droneService.createDrone(payload);
    }
    await fetchDrones();
  };

  const handleDeleteDrone = async (id: string) => {
    try {
      await droneService.deleteDrone(id);
      await fetchDrones();
    } catch {
      setError("Failed to delete drone");
    }
  };

  const handleEditDrone = (drone: Drone) => {
    setSelectedDrone(drone);
    setIsRegisterOpen(true);
  };

  return (
    <div className="p-8 flex flex-col gap-6 w-full">
      <PageHeader title="DRONES">
         <ChamferButton variant="dark" size="sm"   onClick={() => {
            setSelectedDrone(null);
            setIsRegisterOpen(true);
          }}>
            <Plus className="w-4 h-4 text-white" />
            <span>Register Drone</span>
        </ChamferButton>
      </PageHeader>

      {error && (
        <div className="p-3 bg-[var(--color-status-alert-bg)] border border-[var(--color-status-alert-border)] text-[var(--color-status-alert-text)] text-xs rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[var(--color-tech-red)] hover:text-[var(--color-tech-red-hover)] text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      <DronesTable
        drones={drones}
        loading={loading}
        onEditDrone={handleEditDrone}
        onDeleteDrone={handleDeleteDrone}
      />

      <RegisterDroneModal
        isOpen={isRegisterOpen}
        droneToEdit={selectedDrone}
        onClose={() => {
          setIsRegisterOpen(false);
          setSelectedDrone(null);
        }}
        onSubmit={handleSaveDrone}
      />
    </div>
  );
}
