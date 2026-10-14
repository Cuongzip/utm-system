"use client";

import { useId } from "react";
import styles from "./CompassLoader.module.css";

export interface CompassLoaderProps {
  size?: number | string;
  text?: string;
  fullscreen?: boolean;
  className?: string;
}

export function CompassLoader({
  size = 120,
  text,
  fullscreen = false,
  className = "",
}: CompassLoaderProps) {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const gradId = `grad-${safeId}`;
  const mask1Id = `mask1-${safeId}`;
  const mask2Id = `mask2-${safeId}`;

  const loaderSvg = (
    <svg
      className={styles.pl}
      viewBox="0 0 160 160"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#000" />
          <stop offset="100%" stopColor="#fff" />
        </linearGradient>
        <mask id={mask1Id}>
          <rect x="0" y="0" width="160" height="160" fill={`url(#${gradId})`} />
        </mask>
        <mask id={mask2Id}>
          <rect x="28" y="28" width="104" height="104" fill={`url(#${gradId})`} />
        </mask>
      </defs>

      <g>
        <g className={styles.plRingRotate}>
          <circle
            className={styles.plRingStroke}
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="hsl(223,90%,55%)"
            strokeWidth="16"
            strokeDasharray="452.39 452.39"
            strokeDashoffset="452"
            strokeLinecap="round"
            transform="rotate(-45,80,80)"
          />
        </g>
      </g>
      <g mask={`url(#${mask1Id})`}>
        <g className={styles.plRingRotate}>
          <circle
            className={styles.plRingStroke}
            cx="80"
            cy="80"
            r="72"
            fill="none"
            stroke="hsl(193,90%,55%)"
            strokeWidth="16"
            strokeDasharray="452.39 452.39"
            strokeDashoffset="452"
            strokeLinecap="round"
            transform="rotate(-45,80,80)"
          />
        </g>
      </g>

      <g>
        <g
          strokeWidth="4"
          strokeDasharray="12 12"
          strokeDashoffset="12"
          strokeLinecap="round"
          transform="translate(80,80)"
        >
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(-135,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(-90,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(-45,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(0,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(45,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(90,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(135,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,10%,90%)" points="0,2 0,14" transform="rotate(180,0,0) translate(0,40)" />
        </g>
      </g>
      <g mask={`url(#${mask1Id})`}>
        <g
          strokeWidth="4"
          strokeDasharray="12 12"
          strokeDashoffset="12"
          strokeLinecap="round"
          transform="translate(80,80)"
        >
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(-135,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(-90,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(-45,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(0,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(45,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(90,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(135,0,0) translate(0,40)" />
          <polyline className={styles.plTick} stroke="hsl(223,90%,80%)" points="0,2 0,14" transform="rotate(180,0,0) translate(0,40)" />
        </g>
      </g>

      <g>
        <g transform="translate(64,28)">
          <g className={styles.plArrows} transform="rotate(45,16,52)">
            <path fill="hsl(3,90%,55%)" d="M17.998,1.506l13.892,43.594c.455,1.426-.56,2.899-1.998,2.899H2.108c-1.437,0-2.452-1.473-1.998-2.899L14.002,1.506c.64-2.008,3.356-2.008,3.996,0Z" />
            <path fill="hsl(223,10%,90%)" d="M14.009,102.499L.109,58.889c-.453-1.421,.559-2.889,1.991-2.889H29.899c1.433,0,2.444,1.468,1.991,2.889l-13.899,43.61c-.638,2.001-3.345,2.001-3.983,0Z" />
          </g>
        </g>
      </g>
      <g mask={`url(#${mask2Id})`}>
        <g transform="translate(64,28)">
          <g className={styles.plArrows} transform="rotate(45,16,52)">
            <path fill="hsl(333,90%,55%)" d="M17.998,1.506l13.892,43.594c.455,1.426-.56,2.899-1.998,2.899H2.108c-1.437,0-2.452-1.473-1.998-2.899L14.002,1.506c.64-2.008,3.356-2.008,3.996,0Z" />
            <path fill="hsl(223,90%,80%)" d="M14.009,102.499L.109,58.889c-.453-1.421,.559-2.889,1.991-2.889H29.899c1.433,0,2.444,1.468,1.991,2.889l-13.899,43.61c-.638,2.001-3.345,2.001-3.983,0Z" />
          </g>
        </g>
      </g>
    </svg>
  );

  const content = (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {loaderSvg}
      {text && (
        <span className="text-sm font-medium tracking-wide text-zinc-300 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}

export default CompassLoader;
