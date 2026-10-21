"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui";
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
      <PageHeader title="DRONES" subtitle="Manage drone fleet">
        <button
          type="button"
          onClick={() => {
            setSelectedDrone(null);
            setIsRegisterOpen(true);
          }}
          className="h-9 px-4 bg-[#00A3BF] hover:bg-[#008b9e] text-white font-semibold text-xs rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Register Drone</span>
        </button>
      </PageHeader>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-800 text-xs font-bold"
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
