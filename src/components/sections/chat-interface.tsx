"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ChevronDown, Copy, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchPrompts,
  fetchTemplates,
  PromptRecord,
  TemplateRecord,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  isPending?: boolean;
  overleafUrl?: string;
};

type GenerateResponse = {
  data: {
    runId?: number;
    outputUrl: string;
    overleafUrl: string;
    latex: string;
  };
  error?: string;
  details?: string[];
};

function ChatBubble({
  message,
  onCopy,
  onRegenerate,
}: {
  message: ChatMessage;
  onCopy: (content: string) => void;
  onRegenerate: (content: string) => void;
}) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  return (
    <div
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[82%] rounded-3xl px-4 py-3 text-sm shadow-sm md:text-base ${
          isSystem
            ? "bg-[#1a1f3b] text-slate-300"
            : isUser
            ? "bg-indigo-500 text-white rounded-br-none"
            : "bg-[#151a36] text-slate-100 rounded-bl-none"
        }`}
      >
        {message.isPending ? (
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="space-y-2 flex gap-1">
            <p className="whitespace-pre-line mb-0">{message.content}</p>
            {message.overleafUrl && (
              <a
                className="inline-flex items-center gap-2 text-teal-300 underline-offset-4 hover:underline"
                href={message.overleafUrl}
                target="_blank"
                rel="noreferrer"
              >
                view.
              </a>
            )}
            {isUser && (
              <div className="z-50 flex absolute bottom-[-24px] left-2 items-center gap-4 transition">
                <button
                  type="button"
                  onClick={() => onCopy(message.content)}
                  className="inline-flex items-center gap-1 text-xs text-slate-200 hover:text-white cursor-pointer"
                  aria-label="Copy job description"
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onRegenerate(message.content)}
                  className="inline-flex items-center gap-1 text-xs text-slate-200 hover:text-white cursor-pointer"
                  aria-label="Regenerate with this job description"
                  title="Regenerate"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatInterface() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { push } = useToast();
  const storageKey = "resume-optimizer-chat";
  const [jobDescription, setJobDescription] = useState("");
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);
  const [promptId, setPromptId] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [composerHeight, setComposerHeight] = useState(400);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const defaultWelcome: ChatMessage = {
    id: "welcome",
    role: "assistant",
    content:
      "Paste a job description to generate a tailored LaTeX resume. I will return an Overleaf link when it is ready.",
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as {
          jobDescription?: string;
          messages?: ChatMessage[];
          templateId?: number;
          promptId?: number;
          composerHeight?: number;
        };
        if (parsed.jobDescription) setJobDescription(parsed.jobDescription);
        if (parsed.messages?.length) {
          setMessages(parsed.messages);
        } else {
          setMessages([defaultWelcome]);
        }
        if (parsed.templateId) setTemplateId(parsed.templateId);
        if (parsed.promptId) setPromptId(parsed.promptId);
        if (parsed.composerHeight) setComposerHeight(parsed.composerHeight);
      } catch {
        setMessages([defaultWelcome]);
      }
    } else {
      setMessages([defaultWelcome]);
    }
    setIsHydrated(true);

    const handleBeforeUnload = () => {
      window.sessionStorage.removeItem(storageKey);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    const payload = {
      jobDescription,
      messages,
      templateId,
      promptId,
      composerHeight,
    };
    window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
  }, [isHydrated, jobDescription, messages, templateId, promptId, composerHeight]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const onScroll = () => {
      const threshold = 120;
      const distance =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsNearBottom(distance < threshold);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom("smooth");
    }
  }, [messages, isNearBottom]);

  useEffect(() => {
    const load = async () => {
      try {
        const [templatesResponse, promptsResponse] = await Promise.all([
          fetchTemplates(),
          fetchPrompts(),
        ]);
        setTemplates(templatesResponse.data);
        setPrompts(promptsResponse.data);
        const defaultTemplate = templatesResponse.data.find(
          (template) => template.isDefault
        );
        const defaultPrompt = promptsResponse.data.find(
          (prompt) => prompt.isDefault
        );
        setTemplateId((prev) => prev ?? defaultTemplate?.id);
        setPromptId((prev) => prev ?? defaultPrompt?.id);
      } catch (error) {
        push({
          title:
            error instanceof Error
              ? error.message
              : "Failed to load templates or prompts.",
          variant: "error",
        });
      }
    };
    load();
  }, [push]);

  const helperText = useMemo(() => {
    if (!templates.length || !prompts.length) {
      return "Add at least one template and prompt in Settings before generating.";
    }
    return "Press Enter to send. Shift + Enter for a new line.";
  }, [templates.length, prompts.length]);

  const handleGenerate = async (overrideText?: string) => {
    const nextText = String(overrideText ?? jobDescription ?? "");
    if (!nextText.trim() || isBusy) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextText.trim(),
    };

    const pendingMessage: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: "assistant",
      content: "",
      isPending: true,
    };

    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setIsBusy(true);
    if (!overrideText) {
      setJobDescription("");
    }

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription: userMessage.content,
          templateId,
          promptId,
        }),
      });
      const json = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        push({
          title: json.error || "Generation failed.",
          variant: "error",
        });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === pendingMessage.id
              ? {
                  ...message,
                  isPending: false,
                  content:
                    json.details?.join("\n") ||
                    json.error ||
                    "Generation failed.",
                }
              : message
          )
        );
        return;
      }

      push({ title: "Resume generated successfully.", variant: "success" });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingMessage.id
            ? {
                ...message,
                isPending: false,
                content: "Your resume is ready to",
                overleafUrl: json.data.overleafUrl,
              }
            : message
        )
      );
    } catch (error) {
      push({
        title: error instanceof Error ? error.message : "Generation failed.",
        variant: "error",
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === pendingMessage.id
            ? {
                ...message,
                isPending: false,
                content:
                  error instanceof Error
                    ? error.message
                    : "Generation failed.",
              }
            : message
        )
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = composerHeight;
    const containerHeight =
      containerRef.current?.getBoundingClientRect().height ?? 0;

    const minHeight = 200;
    const maxHeight = Math.max(220, containerHeight - 180);

    const onMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientY - startY;
      const next = Math.max(
        minHeight,
        Math.min(maxHeight, startHeight - delta)
      );
      setComposerHeight(next);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-[calc(100vh-120px)] flex-col rounded-[32px] border border-[#2a2f55] bg-[#0f1228]/90 p-4 md:p-6 !pr-0"
    >
      <div
        ref={scrollRef}
        className="relative flex-1 space-y-4 overflow-y-auto pb-4 pr-4 md:pr-6"
      >
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            onCopy={(content) => {
              navigator.clipboard.writeText(content).then(
                () => push({ title: "Copied to clipboard.", variant: "success" }),
                () => push({ title: "Copy failed.", variant: "error" })
              );
            }}
            onRegenerate={(content) => handleGenerate(content)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {!isNearBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute left-1/2 z-10 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-[#2a2f55] bg-[#111633]/75 text-slate-200 shadow-lg transition hover:bg-[#111633]/90 cursor-pointer"
          style={{ bottom: composerHeight + 70 }}
          aria-label="Jump to latest"
          title="Jump to latest"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
      <div className="mt-auto flex flex-col gap-3 border-t border-[#2a2f55] pt-4 pr-4 md:pr-6">
        <div
          className="relative -mt-4 mb-2 h-4 cursor-row-resize"
          onPointerDown={handleResizeStart}
          aria-label="Resize composer"
          title="Drag to resize"
        >
          <div className="absolute left-1/2 top-1/2 h-[2px] w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-400/40" />
        </div>
        <div
          className="flex flex-col gap-3 lg:flex-row lg:items-stretch"
          style={{ height: composerHeight }}
        >
          <div className="flex h-full flex-1 flex-col gap-2 lg:px-4 !pl-0 lg:w-[85%]">
            <Textarea
              className="min-h-[96px] flex-1 border-[#2a2f55] bg-[#10142f] text-slate-100 placeholder:text-slate-500 focus-visible:ring-indigo-400/60"
              placeholder="Paste job description here..."
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <span className="text-xs text-slate-400">
              {isBusy ? "Generating..." : helperText}
            </span>
          </div>
          <div className="flex h-full flex-col gap-3 lg:w-[15%]">
            <div className="flex">
              <Button
                onClick={() => handleGenerate()}
                disabled={isBusy}
                className="w-full"
              >
                Generate
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="space-y-1 text-xs text-slate-300">
                <div className="mb-1">Template</div>
                <div className="relative">
                  <select
                    className="h-10 w-full truncate min-w-[170px] appearance-none rounded-xl border border-[#2a2f55] bg-[#111633] px-3 pr-9 text-sm text-slate-100"
                    value={templateId ?? ""}
                    onChange={(event) =>
                      setTemplateId(
                        event.target.value
                          ? Number(event.target.value)
                          : undefined
                      )
                    }
                  >
                    <option value="">Select template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
              <label className="space-y-1 text-xs text-slate-300">
                <div className="mb-1">Prompt</div>
                <div className="relative">
                  <select
                    className="h-10 w-full truncate min-w-[170px] appearance-none rounded-xl border border-[#2a2f55] bg-[#111633] px-3 pr-9 text-sm text-slate-100"
                    value={promptId ?? ""}
                    onChange={(event) =>
                      setPromptId(
                        event.target.value ? Number(event.target.value) : undefined
                      )
                    }
                  >
                    <option value="">Select prompt</option>
                    {prompts.map((prompt) => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
