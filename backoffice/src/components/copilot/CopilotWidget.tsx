"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { Bot, X, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton, ChamferCard } from "@/components/ui";
import {
    clampFloatingOffset,
    COPILOT_OFFSET_STORAGE_KEY,
    FLOATING_FAB_SIZE_PX,
    useFloatingPosition,
    type ViewportOffset,
} from "@/hooks";
import { intelligenceService } from "@/services";
import type { CopilotProposedAction } from "@/types";
import { CopilotFabLauncher } from "./CopilotFabLauncher";
import { CopilotEmptyPrompts } from "./CopilotEmptyPrompts";
import { CopilotMessageBubble, type CopilotChatEntry } from "./CopilotMessageBubble";

const COPILOT_TOGGLE_EVENT = "utm:copilot-toggle";

const PANEL_WIDTH_PX = 400;
const PANEL_HEIGHT_PX = 520;
const DEFAULT_OFFSET: ViewportOffset = { right: 20, bottom: 20 };
const IS_COCKPIT_PATH_RE = /^\/dashboard\/flights\/[^/]+\/cockpit(?:\/|$)/;

export function CopilotWidget() {
    const pathname = usePathname();
    const t = useTranslations("copilot");
    const [open, setOpen] = useState(false);
    const { activeOffset, isDragging, startDrag, moveDrag, endDrag, cancelDrag } =
        useFloatingPosition({
            storageKey: COPILOT_OFFSET_STORAGE_KEY,
            defaultOffset: DEFAULT_OFFSET,
            boxSize: FLOATING_FAB_SIZE_PX,
        });
    const [input, setInput] = useState("");
    const [entries, setEntries] = useState<CopilotChatEntry[]>([]);
    const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
    const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
    const [executingActionKey, setExecutingActionKey] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const nextIdRef = useRef(0);

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

    const chatMutation = useMutation({
        mutationFn: async (nextEntries: CopilotChatEntry[]) => {
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
                },
            ]);
        },
    });

    const sendPrompt = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || chatMutation.isPending) return;
        nextIdRef.current += 1;
        const userEntry: CopilotChatEntry = {
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

    if (pathname && IS_COCKPIT_PATH_RE.test(pathname)) {
        return null;
    }

    if (!open) {
        return (
            <CopilotFabLauncher
                activeOffset={activeOffset}
                isDragging={isDragging}
                startDrag={startDrag}
                moveDrag={moveDrag}
                endDrag={endDrag}
                cancelDrag={cancelDrag}
                onOpen={() => setOpen(true)}
            />
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
    const clampedPanel = clampFloatingOffset(activeOffset, panelW, panelH);

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
                        <CopilotEmptyPrompts
                            quickPrompts={quickPrompts}
                            onSelectPrompt={sendPrompt}
                        />
                    ) : (
                        entries.map((entry) => (
                            <CopilotMessageBubble
                                key={entry.id}
                                entry={entry}
                                traceOpen={Boolean(expandedTraces[entry.id])}
                                onToggleTrace={() =>
                                    setExpandedTraces((prev) => ({
                                        ...prev,
                                        [entry.id]: !prev[entry.id],
                                    }))
                                }
                                executedActions={executedActions}
                                executingActionKey={executingActionKey}
                                onExecuteAction={handleExecuteAction}
                            />
                        ))
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
