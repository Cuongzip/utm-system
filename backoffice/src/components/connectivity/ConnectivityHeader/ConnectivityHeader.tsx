"use client";

import { RotateCw, Plus } from "lucide-react";
import { ChamferButton } from "@/components/ui";
import styles from "./ConnectivityHeader.module.css";

interface ConnectivityHeaderProps {
  onRefresh?: () => void;
  onRegisterDevice?: () => void;
}

export function ConnectivityHeader({
  onRefresh,
  onRegisterDevice,
}: ConnectivityHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.6px] leading-[32px]">
          Device Connectivity
        </h1>
        <p className="text-[14px] text-[#64748b] leading-[20px]">
          Manage device connections, certificates, and telemetry
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className={styles.refreshButton}
        >
          <RotateCw className="w-3.5 h-3.5 text-[#334155]" />
          <span>Refresh</span>
        </button>

        <ChamferButton variant="dark" size="sm" onClick={onRegisterDevice}>
          <Plus className="w-4 h-4 text-white" />
          <span>Register Device</span>
        </ChamferButton>
      </div>
    </div>
  );
}

export default ConnectivityHeader;
