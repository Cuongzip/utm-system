"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import {
    Bot,
    X,
    Send,
    Trash2,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    Loader2,
    Terminal,
    ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, ChamferCard, TacticalCallout } from "@/components/ui";
import { intelligenceService } from "@/services";
import type { CopilotToolTraceItem, CopilotProposedAction } from "@/types";

export const COPILOT_TOGGLE_EVENT = "utm:copilot-toggle";

const OFFSET_STORAGE_KEY = "utm_copilot_offset";
const OFFSET_CHANGE_EVENT = "utm:copilot-offset-change";
const EDGE_MARGIN_PX = 12;
const LAUNCHER_SIZE_PX = 46;
const PANEL_WIDTH_PX = 400;
const PANEL_HEIGHT_PX = 520;
const DRAG_THRESHOLD_PX = 5;

interface ViewportOffset {
    right: number;
    bottom: number;
}

interface DragSession {
    pointerId: number;
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    boxWidth: number;
    boxHeight: number;
    lastRight: number;
    lastBottom: number;
    moved: boolean;
}

const DEFAULT_OFFSET: ViewportOffset = { right: 20, bottom: 20 };
let cachedOffsetRaw: string | null = null;
let cachedOffsetViewportKey = "";
let cachedOffsetSnapshot: ViewportOffset = DEFAULT_OFFSET;

function clampOffset(offset: ViewportOffset, boxWidth: number, boxHeight: number): ViewportOffset {
    if (typeof window === "undefined") return offset;
    const maxRight = Math.max(EDGE_MARGIN_PX, window.innerWidth - boxWidth - EDGE_MARGIN_PX);
    const maxBottom = Math.max(EDGE_MARGIN_PX, window.innerHeight - boxHeight - EDGE_MARGIN_PX);
    return {
        right: Math.min(Math.max(EDGE_MARGIN_PX, Math.round(offset.right)), maxRight),
        bottom: Math.min(Math.max(EDGE_MARGIN_PX, Math.round(offset.bottom)), maxBottom),
    };
}

function subscribeOffsetStore(callback: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", callback);
    window.addEventListener("resize", callback);
    window.addEventListener(OFFSET_CHANGE_EVENT, callback);
    return () => {
        window.removeEventListener("storage", callback);
        window.removeEventListener("resize", callback);
        window.removeEventListener(OFFSET_CHANGE_EVENT, callback);
    };
}

function getOffsetSnapshot(): ViewportOffset {
    if (typeof window === "undefined") return DEFAULT_OFFSET;
    const viewportKey = `${window.innerWidth}x${window.innerHeight}`;
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(OFFSET_STORAGE_KEY);
    } catch {
        raw = null;
    }

    if (raw === cachedOffsetRaw && viewportKey === cachedOffsetViewportKey) {
        return cachedOffsetSnapshot;
    }

    let parsedOffset = DEFAULT_OFFSET;
    if (raw) {
        try {
            const parsed = JSON.parse(raw) as Partial<ViewportOffset>;
            if (typeof parsed.right === "number" && typeof parsed.bottom === "number") {
                parsedOffset = { right: parsed.right, bottom: parsed.bottom };
            }
        } catch {
            parsedOffset = DEFAULT_OFFSET;
        }
    }

    const clamped = clampOffset(parsedOffset, LAUNCHER_SIZE_PX, LAUNCHER_SIZE_PX);
    cachedOffsetRaw = raw;
    cachedOffsetViewportKey = viewportKey;
    if (
        clamped.right !== cachedOffsetSnapshot.right ||
        clamped.bottom !== cachedOffsetSnapshot.bottom
    ) {
        cachedOffsetSnapshot = clamped;
    }
    return cachedOffsetSnapshot;
}

function getServerOffsetSnapshot(): ViewportOffset {
    return DEFAULT_OFFSET;
}

function saveOffsetToStorage(next: ViewportOffset) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(OFFSET_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(OFFSET_CHANGE_EVENT));
    } catch {
        // ignore storage quota errors
    }
}

export function toggleCopilot() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(COPILOT_TOGGLE_EVENT));
    }
}

interface ChatEntry {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolTrace?: CopilotToolTraceItem[];
    proposedActions?: CopilotProposedAction[];
    model?: string;
}

export function CopilotWidget() {
    const t = useTranslations("copilot");
    const [open, setOpen] = useState(false);
    const persistedOffset = useSyncExternalStore(
        subscribeOffsetStore,
        getOffsetSnapshot,
        getServerOffsetSnapshot
    );
    const [dragOffset, setDragOffset] = useState<ViewportOffset | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [input, setInput] = useState("");
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
    const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
    const [executingActionKey, setExecutingActionKey] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const dragSessionRef = useRef<DragSession | null>(null);
    const nextIdRef = useRef(0);

    const activeOffset = dragOffset ?? persistedOffset;

    const quickPrompts = [t("quickPrompts.p1"), t("quickPrompts.p2"), t("quickPrompts.p3")];

    useEffect(() => {
        const handleToggle = () => setOpen((prev) => !prev);
        window.addEventListener(COPILOT_TOGGLE_EVENT, handleToggle);
        return () => window.removeEventListener(COPILOT_TOGGLE_EVENT, handleToggle);
    }, []);

    useEffect(() => {
        if (open && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [open, entries]);

    useEffect(() => {
        if (!open) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                setOpen(false);
            }
        };
        window.addEventListener("keydown", handleKeyDown, true);
        return () => window.removeEventListener("keydown", handleKeyDown, true);
    }, [open]);

    const startDrag = (
        e: React.PointerEvent<HTMLElement>,
        originOffset: ViewportOffset,
        boxWidth: number,
        boxHeight: number
    ) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragSessionRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startRight: originOffset.right,
            startBottom: originOffset.bottom,
            boxWidth,
            boxHeight,
            lastRight: originOffset.right,
            lastBottom: originOffset.bottom,
            moved: false,
        };
    };

    const moveDrag = (e: React.PointerEvent<HTMLElement>) => {
        const session = dragSessionRef.current;
        if (!session || session.pointerId !== e.pointerId) return;

        const dx = e.clientX - session.startX;
        const dy = e.clientY - session.startY;
        if (!session.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
            session.moved = true;
            setIsDragging(true);
        }
        if (!session.moved) return;

        const next = clampOffset(
            {
                right: session.startRight - dx,
                bottom: session.startBottom - dy,
            },
            session.boxWidth,
            session.boxHeight
        );
        session.lastRight = next.right;
        session.lastBottom = next.bottom;
        setDragOffset(next);
    };

    const endDrag = (e: React.PointerEvent<HTMLElement>, onTap?: () => void) => {
        const session = dragSessionRef.current;
        if (!session || session.pointerId !== e.pointerId) return;

        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        dragSessionRef.current = null;
        setIsDragging(false);

        if (session.moved) {
            saveOffsetToStorage({ right: session.lastRight, bottom: session.lastBottom });
            setDragOffset(null);
        } else {
            setDragOffset(null);
            onTap?.();
        }
    };

    const cancelDrag = (e: React.PointerEvent<HTMLElement>) => {
        const session = dragSessionRef.current;
        if (!session || session.pointerId !== e.pointerId) return;
        dragSessionRef.current = null;
        setDragOffset(null);
        setIsDragging(false);
    };

    const chatMutation = useMutation({
        mutationFn: async (nextEntries: ChatEntry[]) => {
            const messages = nextEntries.map((e) => ({ role: e.role, content: e.content }));
            return intelligenceService.chatCopilot(messages);
        },
        meta: { defaultErrorMessage: t("requestFailed") },
        onSuccess: (res) => {
            const replyText =
                res.reply?.trim() || (res.enabled === false ? t("llmDisabled") : t("noResponse"));
            nextIdRef.current += 1;
            const entryId = `asst-${nextIdRef.current}`;
            setEntries((prev) => [
                ...prev,
                {
                    id: entryId,
                    role: "assistant",
                    content: replyText,
                    toolTrace: res.toolTrace,
                    proposedActions: res.proposedActions,
                    model: res.model,
                },
            ]);
        },
    });

    const sendPrompt = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || chatMutation.isPending) return;
        nextIdRef.current += 1;
        const userEntry: ChatEntry = {
            id: `usr-${nextIdRef.current}`,
            role: "user",
            content: trimmed,
        };
        const nextEntries = [...entries, userEntry];
        setEntries(nextEntries);
        setInput("");
        chatMutation.mutate(nextEntries);
    };

    const handleExecuteAction = async (
        entryId: string,
        idx: number,
        action: CopilotProposedAction
    ) => {
        if (!action.method || !action.path) return;
        const key = `${entryId}-${idx}`;
        setExecutingActionKey(key);
        const target = action.label || action.path;
        try {
            await intelligenceService.executeProposedAction(
                action.method,
                action.path,
                action.body
            );
            setExecutedActions((prev) => ({ ...prev, [key]: true }));
            toast.success(t("executedToast", { target }));
        } catch {
            toast.error(t("failedExecuteToast", { target }));
        } finally {
            setExecutingActionKey(null);
        }
    };

    if (!open) {
        return (
            <button
                type="button"
                aria-label={t("openLabel")}
                title={t("launcherTooltip")}
                style={{ right: `${activeOffset.right}px`, bottom: `${activeOffset.bottom}px` }}
                onPointerDown={(e) =>
                    startDrag(e, activeOffset, LAUNCHER_SIZE_PX, LAUNCHER_SIZE_PX)
                }
                onPointerMove={moveDrag}
                onPointerUp={(e) => endDrag(e, () => setOpen(true))}
                onPointerCancel={cancelDrag}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpen(true);
                    }
                }}
                className={`group fixed z-50 h-[46px] w-[46px] p-[1.5px] chamfer-sm bg-slate-400/90 hover:bg-slate-300 drop-shadow-[0_8px_20px_rgba(15,23,42,0.28)] flex items-center justify-center touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                    isDragging ? "cursor-grabbing scale-105" : "cursor-grab transition-transform"
                }`}
            >
                <span className="w-full h-full chamfer-sm bg-slate-800 group-hover:bg-slate-700 text-white flex items-center justify-center transition-colors pointer-events-none">
                    <Bot className="w-5 h-5 text-white" aria-hidden="true" />
                </span>
            </button>
        );
    }

    const panelW =
        typeof window !== "undefined"
            ? Math.min(PANEL_WIDTH_PX, window.innerWidth - 24)
            : PANEL_WIDTH_PX;
    const panelH =
        typeof window !== "undefined"
            ? Math.min(PANEL_HEIGHT_PX, window.innerHeight - 24)
            : PANEL_HEIGHT_PX;
    const clampedPanel = clampOffset(activeOffset, panelW, panelH);

    return (
        <div
            role="dialog"
            aria-label={t("title")}
            style={{ right: `${clampedPanel.right}px`, bottom: `${clampedPanel.bottom}px` }}
            className="fixed z-50 w-[calc(100vw-1.5rem)] sm:w-[400px] h-[520px] max-h-[calc(100dvh-1.5rem)] drop-shadow-2xl flex flex-col"
        >
            <ChamferCard
                size="lg"
                className="w-full h-full overflow-hidden"
                innerClassName="overflow-hidden"
            >
                <div
                    onPointerDown={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return;
                        startDrag(e, clampedPanel, panelW, panelH);
                    }}
                    onPointerMove={moveDrag}
                    onPointerUp={(e) => endDrag(e)}
                    onPointerCancel={cancelDrag}
                    title={t("dragTooltip")}
                    className={`px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 shrink-0 touch-none select-none ${
                        isDragging ? "cursor-grabbing" : "cursor-grab"
                    }`}
                >
                    <div className="flex items-center gap-2.5 pointer-events-none min-w-0">
                        <span className="w-6 h-6 chamfer-xs bg-slate-800 text-white flex items-center justify-center shrink-0">
                            <Bot className="w-3.5 h-3.5" aria-hidden="true" />
                        </span>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 truncate">
                            {t("title")}
                        </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        {entries.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setEntries([])}
                                title={t("clearChat")}
                                aria-label={t("clearChat")}
                                className="w-7 h-7 rounded border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            title={t("minimize")}
                            aria-label={t("minimize")}
                            className="w-7 h-7 rounded border border-transparent hover:border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto utm-scroll p-3.5 flex flex-col gap-3 bg-slate-50/80"
                >
                    {entries.length === 0 ? (
                        <div className="my-auto flex flex-col gap-3 px-1">
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="w-9 h-9 p-[1px] chamfer-xs bg-slate-300">
                                    <div className="w-full h-full chamfer-xs bg-white flex items-center justify-center text-slate-700">
                                        <Bot className="w-4 h-4" aria-hidden="true" />
                                    </div>
                                </div>
                                <p className="px-2 text-xs font-medium text-slate-600 leading-relaxed">
                                    {t("emptyHeading")}
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {quickPrompts.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        onClick={() => sendPrompt(prompt)}
                                        className="group flex items-center justify-between gap-2 text-left px-3 py-2.5 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-xs text-slate-700 hover:text-slate-900 shadow-2xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        <span className="leading-snug">{prompt}</span>
                                        <ChevronRight
                                            className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0"
                                            aria-hidden="true"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        entries.map((entry) => {
                            const isUser = entry.role === "user";
                            const hasTrace = Boolean(entry.toolTrace && entry.toolTrace.length > 0);
                            const traceOpen = Boolean(expandedTraces[entry.id]);

                            return (
                                <div
                                    key={entry.id}
                                    className={`flex flex-col gap-1.5 ${
                                        isUser ? "items-end" : "items-start"
                                    }`}
                                >
                                    <div
                                        className={`rounded-md text-xs leading-relaxed whitespace-pre-wrap break-words shadow-2xs ${
                                            isUser
                                                ? "max-w-[88%] px-3 py-2 bg-slate-800 text-white"
                                                : "max-w-[92%] px-3.5 py-2.5 bg-white border border-slate-200/90 text-slate-800"
                                        }`}
                                    >
                                        {entry.content}
                                    </div>

                                    {hasTrace && (
                                        <div className="max-w-[92%] w-full">
                                            <button
                                                type="button"
                                                aria-expanded={traceOpen}
                                                onClick={() =>
                                                    setExpandedTraces((prev) => ({
                                                        ...prev,
                                                        [entry.id]: !prev[entry.id],
                                                    }))
                                                }
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[10px] font-mono font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                            >
                                                <Terminal
                                                    className="w-3 h-3 text-slate-500 shrink-0"
                                                    aria-hidden="true"
                                                />
                                                <span>
                                                    {t("toolTrace", {
                                                        count: entry.toolTrace?.length ?? 0,
                                                    })}
                                                </span>
                                                <ChevronDown
                                                    className={`w-3 h-3 text-slate-400 transition-transform ${
                                                        traceOpen ? "rotate-180" : ""
                                                    }`}
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            {traceOpen && (
                                                <div className="mt-1.5 rounded-md border border-slate-700 bg-slate-900 text-slate-200 p-2.5 text-[10px] font-mono flex flex-col gap-1.5 max-h-40 overflow-y-auto utm-scroll">
                                                    {entry.toolTrace?.map((tr, idx) => (
                                                        <div key={idx}>
                                                            <div className="font-bold text-slate-100">
                                                                {tr.tool || "tool"}
                                                            </div>
                                                            {tr.summary !== undefined && (
                                                                <div className="text-slate-400 break-words">
                                                                    {typeof tr.summary === "string"
                                                                        ? tr.summary
                                                                        : JSON.stringify(
                                                                              tr.summary
                                                                          )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {entry.proposedActions && entry.proposedActions.length > 0 && (
                                        <div className="max-w-[92%] w-full flex flex-col gap-2">
                                            {entry.proposedActions.map((action, idx) => {
                                                const actionKey = `${entry.id}-${idx}`;
                                                const isDone = Boolean(executedActions[actionKey]);
                                                const isRunning = executingActionKey === actionKey;

                                                return (
                                                    <TacticalCallout
                                                        key={actionKey}
                                                        tone="warning"
                                                        icon={ShieldAlert}
                                                        title={action.label || t("proposedAction")}
                                                        description={action.rationale}
                                                    >
                                                        <div className="flex items-center justify-between gap-2 pt-0.5">
                                                            <span className="text-[10px] font-mono text-slate-500 truncate">
                                                                {action.method} {action.path}
                                                            </span>
                                                            {isDone ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 shrink-0">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                    {t("executed")}
                                                                </span>
                                                            ) : (
                                                                <ChamferButton
                                                                    variant="dark"
                                                                    size="xs"
                                                                    disabled={isRunning}
                                                                    onClick={() =>
                                                                        handleExecuteAction(
                                                                            entry.id,
                                                                            idx,
                                                                            action
                                                                        )
                                                                    }
                                                                >
                                                                    {isRunning ? (
                                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                                    ) : null}
                                                                    <span>
                                                                        {t("confirmExecute")}
                                                                    </span>
                                                                </ChamferButton>
                                                            )}
                                                        </div>
                                                    </TacticalCallout>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}

                    {chatMutation.isPending && (
                        <div
                            role="status"
                            aria-busy="true"
                            aria-label={t("querying")}
                            className="max-w-[78%] rounded-md border border-slate-200 bg-white px-3.5 py-2.5 flex flex-col gap-1.5 shadow-2xs"
                        >
                            <div className="h-3 w-44 rounded bg-slate-200/75 animate-pulse" />
                            <div className="h-3 w-32 rounded bg-slate-200/75 animate-pulse" />
                            <span className="sr-only">{t("querying")}</span>
                        </div>
                    )}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        sendPrompt(input);
                    }}
                    className="px-4 py-3 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Escape") {
                                e.preventDefault();
                                setOpen(false);
                            }
                        }}
                        placeholder={t("inputPlaceholder")}
                        aria-label={t("inputPlaceholder")}
                        disabled={chatMutation.isPending}
                        className="flex-1 h-9 px-3 rounded-md border border-slate-300 bg-slate-50 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-slate-500 focus-visible:ring-1 focus-visible:ring-slate-400 transition-colors"
                    />
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        clip="xs"
                        type="submit"
                        disabled={chatMutation.isPending || !input.trim()}
                        aria-label={t("sendMessage")}
                        className="h-9 w-9 px-0 shrink-0"
                    >
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    </ChamferButton>
                </form>
            </ChamferCard>
        </div>
    );
}
