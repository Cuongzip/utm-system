"use client";

import { useState, useRef, useEffect } from "react";
import { PRIMARY_COLOR, THEME_COLORS } from "@/constants";

interface CornerDecorationsProps {
  color?: string;
  scale?: number;
}

export function UtmCornerDecorationsTopLeft({
  color = PRIMARY_COLOR,
  scale = 1,
}: CornerDecorationsProps) {
  const width = 185 * scale;
  const height = 145 * scale;
  const top = -7.5 * scale;
  const left = -25 * scale;

  return (
    <svg
      className="absolute pointer-events-none select-none z-20"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        top: `${top}px`,
        left: `${left}px`,
      }}
      viewBox="25 7.5 185 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke={color} strokeLinejoin="miter">
        <path
          d="M 25,67.5 L 70,7.5"
          strokeWidth="1.5"
          strokeLinecap="butt"
        />
        <path
          d="M 50,90 L 106.25,15"
          strokeWidth="3.5"
          strokeLinecap="butt"
        />
        <path
          d="M 104.5,15 L 210,15"
          strokeWidth="1.5"
          strokeLinecap="butt"
        />
        <path
          d="M 80,152.5 L 80,97.5 L 125,37.5 L 197.5,37.5"
          strokeWidth="1.2"
          strokeLinecap="butt"
        />
      </g>
    </svg>
  );
}

export function UtmCornerDecorationsBottomRight({
  color = PRIMARY_COLOR,
  scale = 1,
}: CornerDecorationsProps) {
  const width = 185 * scale;
  const height = 145 * scale;
  const bottom = -7.5 * scale;
  const right = -25 * scale;

  return (
    <svg
      className="absolute pointer-events-none select-none z-20"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        bottom: `${bottom}px`,
        right: `${right}px`,
      }}
      viewBox="990 647.5 185 145"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke={color} strokeLinejoin="miter">
        <path
          d="M 1175,732.5 L 1130,792.5"
          strokeWidth="1.5"
          strokeLinecap="butt"
        />
        <path
          d="M 1150,710 L 1093.75,785"
          strokeWidth="3.5"
          strokeLinecap="butt"
        />
        <path
          d="M 1095.5,785 L 990,785"
          strokeWidth="1.5"
          strokeLinecap="butt"
        />
        <path
          d="M 1120,647.5 L 1120,702.5 L 1075,762.5 L 1002.5,762.5"
          strokeWidth="1.2"
          strokeLinecap="butt"
        />
      </g>
    </svg>
  );
}

interface SignInCardProps {
  primaryColor?: string;
  primaryHoverColor?: string;
  primaryActiveColor?: string;
  onSubmit?: (data: { email: string; password: string }) => void;
}

export default function SignInCard({
  primaryColor = PRIMARY_COLOR,
  primaryHoverColor = THEME_COLORS.primaryHover,
  primaryActiveColor = THEME_COLORS.primaryActive,
  onSubmit,
}: SignInCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          const calculatedScale = Math.min(0.85, Math.max(0.48, (width / 480) * 0.72));
          setScale(calculatedScale);
        }
      }
    });

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (onSubmit) {
      onSubmit({ email, password });
    }
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const dynamicStyles = {
    "--utm-primary": primaryColor,
    "--utm-primary-hover": primaryHoverColor,
    "--utm-primary-active": primaryActiveColor,
  } as React.CSSProperties;

  const cutX = Number((56.25 * scale).toFixed(2));
  const cutY = Number((75 * scale).toFixed(2));
  const innerCutX = Number((cutX - 1).toFixed(2));
  const innerCutY = Number((cutY - 1).toFixed(2));

  const outerClipPath = `polygon(${cutX}px 0, calc(100% - ${cutX}px) 0, 100% ${cutY}px, 100% calc(100% - ${cutY}px), calc(100% - ${cutX}px) 100%, ${cutX}px 100%, 0 calc(100% - ${cutY}px), 0 ${cutY}px)`;
  const innerClipPath = `polygon(${innerCutX}px 0, calc(100% - ${innerCutX}px) 0, 100% ${innerCutY}px, 100% calc(100% - ${innerCutY}px), calc(100% - ${innerCutX}px) 100%, ${innerCutX}px 100%, 0 calc(100% - ${innerCutY}px), 0 ${innerCutY}px)`;

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-[480px]"
      style={dynamicStyles}
    >
      <UtmCornerDecorationsTopLeft color={primaryColor} scale={scale} />
      <UtmCornerDecorationsBottomRight color={primaryColor} scale={scale} />

      <div
        className="relative w-full bg-[#d1d5db] p-[1.5px] drop-shadow-[0px_8px_25px_rgba(0,0,0,0.06)]"
        style={{ clipPath: outerClipPath }}
      >
        <div
          className="relative w-full bg-white px-7 py-9 sm:px-10 sm:py-10 flex flex-col gap-7 sm:gap-8"
          style={{ clipPath: innerClipPath }}
        >
          <div className="flex items-center justify-center gap-3">
            <svg
              className="w-10 h-10 shrink-0"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="20" cy="20" r="3.75" stroke={primaryColor} strokeWidth="2.08" />
              <circle cx="9.17" cy="11.67" r="2.92" fill={primaryColor} />
              <circle cx="30.83" cy="11.67" r="2.92" fill={primaryColor} />
              <circle cx="9.17" cy="28.33" r="2.92" fill={primaryColor} />
              <circle cx="30.83" cy="28.33" r="2.92" fill={primaryColor} />
              <path d="M11.25 13.75L17.08 17.92" stroke={primaryColor} strokeWidth="2.08" strokeLinecap="round" />
              <path d="M28.75 13.75L22.92 17.92" stroke={primaryColor} strokeWidth="2.08" strokeLinecap="round" />
              <path d="M11.25 26.25L17.08 22.08" stroke={primaryColor} strokeWidth="2.08" strokeLinecap="round" />
              <path d="M28.75 26.25L22.92 22.08" stroke={primaryColor} strokeWidth="2.08" strokeLinecap="round" />
            </svg>
            <div className="flex flex-col">
              <span className="text-[14px] font-bold tracking-[2.24px] uppercase text-[#111827] leading-tight">
                UTM SYSTEM
              </span>
              <span className="text-[11px] font-medium tracking-[-0.275px] text-[#6b7280] leading-tight">
                Unmanned Traffic Management
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pt-1">
            <h1 className="text-[28px] font-bold tracking-[-0.7px] text-[#111827] leading-tight">
              Welcome Back
            </h1>
            <p className="text-[14px] font-normal text-[#6b7280] leading-normal">
              Sign in to your UTM account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="utm-email"
                className="text-[12px] font-semibold text-[#374151] leading-none"
              >
                Email Address
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#9ca3af] pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect
                      x="2"
                      y="3.5"
                      width="12"
                      height="9"
                      rx="1"
                      stroke="#9CA3AF"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M2 4.5L8 9L14 4.5"
                      stroke="#9CA3AF"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <input
                  id="utm-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full bg-white border border-[#d1d5db] rounded-[4px] pl-10 pr-3.5 py-2.5 text-[14px] text-[#111827] placeholder-[#9ca3af] outline-none transition-all shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[var(--utm-primary)] focus:ring-1 focus:ring-[var(--utm-primary)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="utm-password"
                  className="text-[12px] font-semibold text-[#374151] leading-none"
                >
                  Password
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => e.preventDefault()}
                  className="text-[12px] font-medium text-[var(--utm-primary)] hover:opacity-80 transition-opacity leading-none"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-[#9ca3af] pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect
                      x="3"
                      y="6.5"
                      width="10"
                      height="7"
                      rx="1.5"
                      stroke="#9CA3AF"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M5.5 6.5V4.5C5.5 3.12 6.62 2 8 2C9.38 2 10.5 3.12 10.5 4.5V6.5"
                      stroke="#9CA3AF"
                      strokeWidth="1.2"
                    />
                    <circle cx="8" cy="10" r="1" fill="#9CA3AF" />
                  </svg>
                </span>
                <input
                  id="utm-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-white border border-[#d1d5db] rounded-[4px] pl-10 pr-10 py-2.5 text-[14px] text-[#111827] placeholder-[#9ca3af] outline-none transition-all shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[var(--utm-primary)] focus:ring-1 focus:ring-[var(--utm-primary)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-[#9ca3af] hover:text-[var(--utm-primary)] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M1.5 8C2.5 5 5 3 8 3C11 3 13.5 5 14.5 8C13.5 11 11 13 8 13C5 13 2.5 11 1.5 8Z"
                        stroke="#9CA3AF"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="8" cy="8" r="2.2" stroke="#9CA3AF" strokeWidth="1.2" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 2L14 14"
                        stroke="#9CA3AF"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6.5 6.6C6.1 7 5.9 7.5 5.9 8.1C5.9 9.3 6.8 10.2 8 10.2C8.6 10.2 9.1 10 9.5 9.6"
                        stroke="#9CA3AF"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M9.8 5.4C9.3 5.1 8.7 5 8 5C5.3 5 3.1 6.8 2 8.1C2.8 9.1 4.1 10.3 5.8 10.9"
                        stroke="#9CA3AF"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10.5 6.1C12.3 7 13.5 8 14 8.1C13.4 9 12.4 10.1 11.1 10.8"
                        stroke="#9CA3AF"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full h-[44px] bg-[var(--utm-primary)] hover:bg-[var(--utm-primary-hover)] active:bg-[var(--utm-primary-active)] text-white flex items-center justify-center gap-2 font-semibold text-[14px] tracking-[0.35px] transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                style={{
                  clipPath:
                    "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                }}
              >
                <span>{isLoading ? "Signing In..." : "Sign In"}</span>
                {!isLoading && (
                  <svg
                    width="14"
                    height="11"
                    viewBox="0 0 14 11"
                    fill="none"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path
                      d="M8 0.8L12.5 5.3M12.5 5.3L8 9.8M12.5 5.3H0.8"
                      stroke="white"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
