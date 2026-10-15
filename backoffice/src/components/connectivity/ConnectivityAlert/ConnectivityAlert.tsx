"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import styles from "./ConnectivityAlert.module.css";

interface ConnectivityAlertProps {
  message?: string;
  onDismiss?: () => void;
}

export function ConnectivityAlert({
  message = "Failed to fetch devices",
  onDismiss,
}: ConnectivityAlertProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div className={styles.alertContainer}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[#be123c] shrink-0" />
        <span className={styles.alertText}>{message}</span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className={styles.closeButton}
        aria-label="Dismiss alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default ConnectivityAlert;
