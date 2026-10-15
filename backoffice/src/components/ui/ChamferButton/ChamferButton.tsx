"use client";

import React from "react";
import styles from "./ChamferButton.module.css";

export type ChamferButtonVariant = "dark" | "outline" | "active";
export type ChamferButtonSize = "sm" | "md";

interface ChamferButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ChamferButtonVariant;
  size?: ChamferButtonSize;
  children: React.ReactNode;
}

export function ChamferButton({
  variant = "dark",
  size = "sm",
  className = "",
  children,
  ...props
}: ChamferButtonProps) {
  const sizeClass = size === "sm" ? styles.btnSm : styles.btnMd;
  const variantClass = styles[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none font-bold ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default ChamferButton;
