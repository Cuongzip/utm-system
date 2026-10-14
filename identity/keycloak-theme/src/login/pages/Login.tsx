import { useState, useRef, useEffect } from "react";
import type { PageProps } from "keycloakify/login/pages/PageProps";
import type { KcContext } from "../KcContext";
import type { I18n } from "../i18n";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

interface CornerDecorationsProps {
  color?: string;
  scale?: number;
}

export function UtmCornerDecorationsTopLeft({
  color = "var(--utm-primary, #64748B)",
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
  color = "var(--utm-primary, #64748B)",
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
        >
          <UtmCornerDecorationsTopLeft scale={scale} />
          <UtmCornerDecorationsBottomRight scale={scale} />

          <div
            className="relative w-full bg-[#d1d5db] p-[1.5px] drop-shadow-[0px_8px_25px_rgba(0,0,0,0.06)]"
            style={{ clipPath: outerClipPath }}
          >
            <div
              className="relative w-full bg-white px-7 py-9 sm:px-10 sm:py-10 flex flex-col gap-7 sm:gap-8"
              style={{ clipPath: innerClipPath }}
            >
              <div className="flex items-center justify-center gap-3">
                <img
                  src={`${url.resourcesPath}/dist/svg/utm-logo.svg`}
                  alt="UTM System"
                  className="w-10 h-10 shrink-0 select-none pointer-events-none"
                />
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
                  {isErrorMessage ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" strokeWidth={1.75} />
                  ) : isSuccessMessage ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" strokeWidth={1.75} />
                  ) : isWarningMessage ? (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" strokeWidth={1.75} />
                  ) : (
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" strokeWidth={1.75} />
                  )}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: displayMessage,
                    }}
                  />
                </div>
              )}

              <form
                id="kc-form-login"
                action={url.loginAction}
                method="post"
                onSubmit={() => setIsSubmitting(true)}
                className="flex flex-col gap-5"
              >
                {auth?.selectedCredential && (
                  <input
                    type="hidden"
                    name="credentialId"
                    value={auth.selectedCredential}
                  />
                )}

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
                        <Mail className="w-4 h-4" strokeWidth={1.75} />
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
                      <Lock className="w-4 h-4" strokeWidth={1.75} />
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
                        <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                      ) : (
                        <Eye className="w-4 h-4" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </div>

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
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
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
