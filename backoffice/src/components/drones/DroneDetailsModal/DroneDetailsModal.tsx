"use client";

import { X, Battery, Gauge, MapPin, Plane, Clock } from "lucide-react";
import { ChamferCard, ChamferButton } from "@/components/ui";
import type { Drone } from "@/types";

interface DroneDetailsModalProps {
  drone: Drone | null;
  onClose: () => void;
}

export function DroneDetailsModal({ drone, onClose }: DroneDetailsModalProps) {
  if (!drone) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg filter drop-shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ChamferCard size="lg" accent="cyan" className="w-full">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Plane className="w-5 h-5 text-[#00A3BF]" />
              <h3 className="text-base font-bold text-slate-900 font-mono">
                {drone.registrationNumber || drone.serialNumber || drone.id}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-md border border-slate-200">
              <div>
                <span className="text-slate-400 font-mono uppercase text-[10px] block">
                  MANUFACTURER
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {drone.manufacturer || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-mono uppercase text-[10px] block">
                  MODEL DESIGNATION
                </span>
                <span className="font-bold text-slate-800 text-sm">{drone.model}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-slate-500 font-medium">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  Base Station Hub
                </span>
                <span className="font-semibold text-slate-800">
                  {drone.homeHub?.name
                    ? `${drone.homeHub.name} (${drone.homeHub.code})`
                    : drone.homeHubName || drone.homeHubId || "Unassigned"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-slate-500 font-medium">
                  <Battery className="w-4 h-4 text-slate-400" />
                  Battery Rating
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {drone.batteryCapacityWh ? `${drone.batteryCapacityWh} Wh` : "Standard"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-slate-500 font-medium">
                  <Gauge className="w-4 h-4 text-slate-400" />
                  Max Payload
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {drone.maxPayload ? `${drone.maxPayload} kg` : "N/A"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="flex items-center gap-2 text-slate-500 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Flight Hours Logged
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {drone.flightHours !== undefined ? `${drone.flightHours} hrs` : "0 hrs"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 font-medium">Operational Status</span>
                <span className="font-mono font-bold text-xs uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  {drone.status}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <ChamferButton
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
              >
                Close
              </ChamferButton>
            </div>
          </div>
        </ChamferCard>
      </div>
    </div>
  );
}

export default DroneDetailsModal;
