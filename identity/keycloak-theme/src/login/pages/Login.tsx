import { useState, useRef, useEffect } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";

const PRIMARY_COLOR = "#64748B";
const PRIMARY_HOVER_COLOR = "#475569";
const PRIMARY_ACTIVE_COLOR = "#334155";

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
        <path d="M 25,67.5 L 70,7.5" strokeWidth="1.5" strokeLinecap="butt" />
        <path d="M 50,90 L 106.25,15" strokeWidth="3.5" strokeLinecap="butt" />
        <path d="M 104.5,15 L 210,15" strokeWidth="1.5" strokeLinecap="butt" />
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

export default function Login(
  props: PageProps<Extract<KcContext, { pageId: "login.ftl" }>, I18n>
) {
  const { kcContext } = props;
  const { realm, url, usernameHidden, login, auth, messagesPerField, message } =
    kcContext;

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.72);

  useEffect(() => {
    document.title = "Đăng nhập - UTM System";
  }, []);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (width > 0) {
          const calculatedScale = Math.min(
            0.85,
            Math.max(0.48, (width / 480) * 0.72)
          );
          setScale(calculatedScale);
        }
      }
    });

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const dynamicStyles = {
    "--utm-primary": PRIMARY_COLOR,
    "--utm-primary-hover": PRIMARY_HOVER_COLOR,
    "--utm-primary-active": PRIMARY_ACTIVE_COLOR,
  } as React.CSSProperties;

  const cutX = Number((56.25 * scale).toFixed(2));
  const cutY = Number((75 * scale).toFixed(2));
  const innerCutX = Number((cutX - 1).toFixed(2));
  const innerCutY = Number((cutY - 1).toFixed(2));

  const outerClipPath = `polygon(${cutX}px 0, calc(100% - ${cutX}px) 0, 100% ${cutY}px, 100% calc(100% - ${cutY}px), calc(100% - ${cutX}px) 100%, ${cutX}px 100%, 0 calc(100% - ${cutY}px), 0 ${cutY}px)`;
  const innerClipPath = `polygon(${innerCutX}px 0, calc(100% - ${innerCutX}px) 0, 100% ${innerCutY}px, 100% calc(100% - ${innerCutY}px), calc(100% - ${innerCutX}px) 100%, ${innerCutX}px 100%, 0 calc(100% - ${innerCutY}px), 0 ${innerCutY}px)`;

  const hasFieldError = messagesPerField.existsError("username", "password");
  const fieldErrorMessage = hasFieldError
    ? messagesPerField.getFirstError("username", "password")
    : undefined;

  const displayMessage =
    message !== undefined && message.summary
      ? message.summary
      : fieldErrorMessage;

  const isErrorMessage =
    (message && message.type === "error") || Boolean(fieldErrorMessage);
  const isSuccessMessage = message && message.type === "success";
  const isWarningMessage = message && message.type === "warning";

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 bg-[#f8fafc] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-200/50 via-slate-100/20 to-transparent" />

      <div className="relative z-10 w-full flex items-center justify-center">
        <div
          ref={cardRef}
          className="relative w-full max-w-[480px]"
          style={dynamicStyles}
        >
          <UtmCornerDecorationsTopLeft color={PRIMARY_COLOR} scale={scale} />
          <UtmCornerDecorationsBottomRight
            color={PRIMARY_COLOR}
            scale={scale}
          />

          <div
            className="relative w-full bg-[#d1d5db] p-[1.5px] drop-shadow-[0px_8px_25px_rgba(0,0,0,0.06)]"
            style={{ clipPath: outerClipPath }}
          >
            <div
              className="relative w-full bg-white px-7 py-9 sm:px-10 sm:py-10 flex flex-col gap-7 sm:gap-8"
              style={{ clipPath: innerClipPath }}
            >
              {/* UTM Brand Header */}
              <div className="flex items-center justify-center gap-3">
                <svg
                  className="w-10 h-10 shrink-0"
                  viewBox="0 0 40 40"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="20"
                    cy="20"
                    r="3.75"
                    stroke={PRIMARY_COLOR}
                    strokeWidth="2.08"
                  />
                  <circle cx="9.17" cy="11.67" r="2.92" fill={PRIMARY_COLOR} />
                  <circle
                    cx="30.83"
                    cy="11.67"
                    r="2.92"
                    fill={PRIMARY_COLOR}
                  />
                  <circle cx="9.17" cy="28.33" r="2.92" fill={PRIMARY_COLOR} />
                  <circle
                    cx="30.83"
                    cy="28.33"
                    r="2.92"
                    fill={PRIMARY_COLOR}
                  />
                  <path
                    d="M11.25 13.75L17.08 17.92"
                    stroke={PRIMARY_COLOR}
                    strokeWidth="2.08"
                    strokeLinecap="round"
                  />
                  <path
                    d="M28.75 13.75L22.92 17.92"
                    stroke={PRIMARY_COLOR}
                    strokeWidth="2.08"
                    strokeLinecap="round"
                  />
                  <path
                    d="M11.25 26.25L17.08 22.08"
                    stroke={PRIMARY_COLOR}
                    strokeWidth="2.08"
                    strokeLinecap="round"
                  />
                  <path
                    d="M28.75 26.25L22.92 22.08"
                    stroke={PRIMARY_COLOR}
                    strokeWidth="2.08"
                    strokeLinecap="round"
                  />
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

              {/* Title & Description */}
              <div className="flex flex-col gap-1.5 pt-1">
                <h1 className="text-[28px] font-bold tracking-[-0.7px] text-[#111827] leading-tight">
                  Welcome Back
                </h1>
                <p className="text-[14px] font-normal text-[#6b7280] leading-normal">
                  Sign in to your UTM account to continue
                </p>
              </div>

              {/* Status / Alert Message */}
              {displayMessage && (
                <div
                  className={`flex items-start gap-2.5 p-3 rounded text-[13px] leading-snug border ${
                    isErrorMessage
                      ? "bg-red-50 text-red-700 border-red-200"
                      : isSuccessMessage
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : isWarningMessage
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                  role="alert"
                >
                  <svg
                    className="w-4 h-4 shrink-0 mt-0.5"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    {isErrorMessage ? (
                      <path
                        fillRule="evenodd"
                        d="M8 15A7 7 0 108 1a7 7 0 000 14zm.75-10.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm0 7.5a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"
                        clipRule="evenodd"
                      />
                    ) : (
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                        clipRule="evenodd"
                      />
                    )}
                  </svg>
                  <span
                    dangerouslySetInnerHTML={{
                      __html: displayMessage,
                    }}
                  />
                </div>
              )}

              {/* Keycloak Login Form */}
              <form
                id="kc-form-login"
                action={url.loginAction}
                method="post"
                onSubmit={() => setIsSubmitting(true)}
                className="flex flex-col gap-5"
              >
                {/* Hidden credential ID if WebAuthn / credentials */}
                {auth?.selectedCredential && (
                  <input
                    type="hidden"
                    name="credentialId"
                    value={auth.selectedCredential}
                  />
                )}

                {/* Username / Email field */}
                {!usernameHidden && (
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="username"
                      className="text-[12px] font-semibold text-[#374151] leading-none"
                    >
                      Email or Username
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-[#9ca3af] pointer-events-none">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
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
                        id="username"
                        name="username"
                        type="text"
                        defaultValue={login.username ?? ""}
                        placeholder="name@company.com"
                        autoFocus
                        autoComplete="username"
                        required
                        className="w-full bg-white border border-[#d1d5db] rounded-[4px] pl-10 pr-3.5 py-2.5 text-[14px] text-[#111827] placeholder-[#9ca3af] outline-none transition-all shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[var(--utm-primary)] focus:ring-1 focus:ring-[var(--utm-primary)]"
                      />
                    </div>
                  </div>
                )}

                {/* Password field */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-[12px] font-semibold text-[#374151] leading-none"
                    >
                      Password
                    </label>
                    {realm.resetPasswordAllowed && (
                      <a
                        href={url.loginResetCredentialsUrl}
                        tabIndex={5}
                        className="text-[12px] font-medium text-[var(--utm-primary)] hover:opacity-80 transition-opacity leading-none"
                      >
                        Forgot password?
                      </a>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-[#9ca3af] pointer-events-none">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
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
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      className="w-full bg-white border border-[#d1d5db] rounded-[4px] pl-10 pr-10 py-2.5 text-[14px] text-[#111827] placeholder-[#9ca3af] outline-none transition-all shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] focus:border-[var(--utm-primary)] focus:ring-1 focus:ring-[var(--utm-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-[#9ca3af] hover:text-[var(--utm-primary)] transition-colors focus:outline-none"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M1.5 8C2.5 5 5 3 8 3C11 3 13.5 5 14.5 8C13.5 11 11 13 8 13C5 13 2.5 11 1.5 8Z"
                            stroke="#9CA3AF"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <circle
                            cx="8"
                            cy="8"
                            r="2.2"
                            stroke="#9CA3AF"
                            strokeWidth="1.2"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
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

                {/* Remember Me checkbox if enabled in realm */}
                {realm.rememberMe && !usernameHidden && (
                  <div className="flex items-center gap-2">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      defaultChecked={!!login.rememberMe}
                      className="w-4 h-4 rounded border-gray-300 text-[var(--utm-primary)] focus:ring-[var(--utm-primary)]"
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-[12px] font-medium text-[#4b5563] cursor-pointer"
                    >
                      Remember me
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    name="login"
                    id="kc-login"
                    disabled={isSubmitting}
                    className="group relative w-full h-[44px] bg-[var(--utm-primary)] hover:bg-[var(--utm-primary-hover)] active:bg-[var(--utm-primary-active)] text-white flex items-center justify-center gap-2 font-semibold text-[14px] tracking-[0.35px] transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]"
                    style={{
                      clipPath:
                        "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
                    }}
                  >
                    <span>{isSubmitting ? "Signing In..." : "Sign In"}</span>
                    {!isSubmitting && (
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
      </div>
    </main>
  );
}
