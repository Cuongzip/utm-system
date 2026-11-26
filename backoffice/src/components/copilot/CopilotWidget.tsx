"use client";

import { useState, useRef, useEffect } from "react";
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
import { ChamferButton, TacticalCallout } from "@/components/ui";
import { intelligenceService } from "@/services";
import type { CopilotToolTraceItem, CopilotProposedAction } from "@/types";

export const COPILOT_TOGGLE_EVENT = "utm:copilot-toggle";

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

const QUICK_PROMPTS = [
    "Summarize active flights, conflicts, and emergency alerts.",
    "Check fleet readiness across all vertiport hubs.",
    "Evaluate current weather hazards and NOTAM status.",
] as const;

export function CopilotWidget() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [entries, setEntries] = useState<ChatEntry[]>([]);
    const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
    const [executedActions, setExecutedActions] = useState<Record<string, boolean>>({});
    const [executingActionKey, setExecutingActionKey] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const nextIdRef = useRef(0);

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
                setOpen(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open]);

    const chatMutation = useMutation({
        mutationFn: async (nextEntries: ChatEntry[]) => {
            const messages = nextEntries.map((e) => ({ role: e.role, content: e.content }));
            return intelligenceService.chatCopilot(messages);
        },
        meta: { defaultErrorMessage: "Operations Copilot request failed" },
        onSuccess: (res) => {
            const replyText =
                res.reply?.trim() ||
                (res.enabled === false
                    ? "Operations Copilot LLM provider is currently disabled on the server."
                    : "No response received from Operations Copilot.");
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
        try {
            await intelligenceService.executeProposedAction(
                action.method,
                action.path,
                action.body
            );
            setExecutedActions((prev) => ({ ...prev, [key]: true }));
            toast.success(`Executed: ${action.label || action.path}`);
        } catch {
            toast.error(`Failed to execute ${action.label || action.path}`);
        } finally {
            setExecutingActionKey(null);
        }
    };

    if (!open) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-label="Operations Copilot"
            className="fixed bottom-4 left-4 lg:left-[15.75rem] z-50 w-[calc(100vw-2rem)] sm:w-[410px] h-[540px] max-h-[calc(100vh-2rem)] rounded-lg border border-slate-300 bg-white shadow-2xl flex flex-col overflow-hidden"
        >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-slate-300" />
                    <div>
                        <div className="text-xs font-mono font-bold uppercase tracking-wider">
                            Operations Copilot
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                            Live UTM Intelligence Assistant
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {entries.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setEntries([])}
                            title="Clear conversation"
                            aria-label="Clear conversation"
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        title="Close Copilot"
                        aria-label="Close Copilot"
                        className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3 bg-slate-50"
            >
                {entries.length === 0 ? (
                    <div className="my-auto flex flex-col gap-3">
                        <p className="text-center px-2 text-xs font-medium text-slate-600">
                            Ask about live fleet, flights, weather, or airspace
                        </p>
                        <div className="flex flex-col gap-1.5">
                            {QUICK_PROMPTS.map((prompt) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => sendPrompt(prompt)}
                                    className="text-left px-3 py-2 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs text-slate-700 transition-colors cursor-pointer"
                                >
                                    {prompt}
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
                                    className={`max-w-[92%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                                        isUser
                                            ? "bg-slate-800 text-white"
                                            : "bg-white border border-slate-200 text-slate-800"
                                    }`}
                                >
                                    {entry.content}
                                </div>

                                {hasTrace && (
                                    <div className="max-w-[92%] w-full">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedTraces((prev) => ({
                                                    ...prev,
                                                    [entry.id]: !prev[entry.id],
                                                }))
                                            }
                                            className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-800 cursor-pointer"
                                        >
                                            {traceOpen ? (
                                                <ChevronDown className="w-3 h-3" />
                                            ) : (
                                                <ChevronRight className="w-3 h-3" />
                                            )}
                                            <Terminal className="w-3 h-3" />
                                            <span>Tool Trace ({entry.toolTrace?.length ?? 0})</span>
                                        </button>
                                        {traceOpen && (
                                            <div className="mt-1 rounded border border-slate-200 bg-slate-900 text-slate-200 p-2 text-[10px] font-mono flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                                                {entry.toolTrace?.map((t, idx) => (
                                                    <div key={idx}>
                                                        <div className="font-bold text-slate-100">
                                                            {t.tool || "tool"}
                                                        </div>
                                                        {t.summary !== undefined && (
                                                            <div className="text-slate-400 break-words">
                                                                {typeof t.summary === "string"
                                                                    ? t.summary
                                                                    : JSON.stringify(t.summary)}
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
                                                    title={action.label || "Proposed Action"}
                                                    description={action.rationale}
                                                >
                                                    <div className="flex items-center justify-between gap-2 pt-0.5">
                                                        <span className="text-[10px] font-mono text-slate-500 truncate">
                                                            {action.method} {action.path}
                                                        </span>
                                                        {isDone ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700 shrink-0">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Executed
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
                                                                <span>Confirm & Execute</span>
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
                        aria-label="Querying UTM services"
                        className="max-w-[78%] rounded-lg border border-slate-200 bg-white px-3 py-2.5 flex flex-col gap-1.5"
                    >
                        <div className="h-3 w-44 rounded bg-slate-200/75 animate-pulse" />
                        <div className="h-3 w-32 rounded bg-slate-200/75 animate-pulse" />
                        <span className="sr-only">Querying UTM services...</span>
                    </div>
                )}
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    sendPrompt(input);
                }}
                className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2 shrink-0"
            >
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about flights, fleet, weather..."
                    aria-label="Ask Operations Copilot"
                    disabled={chatMutation.isPending}
                    className="flex-1 h-9 px-3 rounded border border-slate-300 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:border-slate-600 focus-visible:ring-2 focus-visible:ring-slate-300"
                />
                <ChamferButton
                    variant="dark"
                    size="sm"
                    type="submit"
                    disabled={chatMutation.isPending || !input.trim()}
                    aria-label="Send message"
                >
                    <Send className="w-3.5 h-3.5" />
                </ChamferButton>
            </form>
        </div>
    );
}
