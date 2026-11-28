"use client";

import { useTranslations } from "next-intl";
import { Bot, ChevronRight } from "lucide-react";

interface CopilotEmptyPromptsProps {
    quickPrompts: string[];
    onSelectPrompt: (prompt: string) => void;
}

export function CopilotEmptyPrompts({ quickPrompts, onSelectPrompt }: CopilotEmptyPromptsProps) {
    const t = useTranslations("copilot");

    return (
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
                        onClick={() => onSelectPrompt(prompt)}
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
    );
}
