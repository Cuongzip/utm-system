"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, CheckCircle2, Loader2, Terminal, ShieldAlert } from "lucide-react";
import { ChamferButton, TacticalCallout } from "@/components/ui";
import type { CopilotToolTraceItem, CopilotProposedAction } from "@/types";

export interface CopilotChatEntry {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolTrace?: CopilotToolTraceItem[];
    proposedActions?: CopilotProposedAction[];
}

interface CopilotMessageBubbleProps {
    entry: CopilotChatEntry;
    traceOpen: boolean;
    onToggleTrace: () => void;
    executedActions: Record<string, boolean>;
    executingActionKey: string | null;
    onExecuteAction: (entryId: string, idx: number, action: CopilotProposedAction) => void;
}

export function CopilotMessageBubble({
    entry,
    traceOpen,
    onToggleTrace,
    executedActions,
    executingActionKey,
    onExecuteAction,
}: CopilotMessageBubbleProps) {
    const t = useTranslations("copilot");
    const isUser = entry.role === "user";
    const hasTrace = Boolean(entry.toolTrace && entry.toolTrace.length > 0);

    return (
        <div className={`flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
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
                        onClick={onToggleTrace}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[10px] font-mono font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        <Terminal className="w-3 h-3 text-slate-500 shrink-0" aria-hidden="true" />
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
                                                : JSON.stringify(tr.summary)}
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
                                            onClick={() => onExecuteAction(entry.id, idx, action)}
                                        >
                                            {isRunning ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : null}
                                            <span>{t("confirmExecute")}</span>
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
}
