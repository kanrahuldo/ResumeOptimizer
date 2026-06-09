"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchPrompts,
  fetchTemplates,
  fetchOpenAiConfigs,
  OpenAiConfigRecord,
  PromptRecord,
  TemplateRecord,
} from "@/lib/api";
import { getProviderLabel } from "@/lib/ai-providers";

type JobInputProps = {
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onGenerate: (payload: { templateId?: number; promptId?: number; aiConfigId?: number }) => void;
  isBusy: boolean;
};

export function JobInput({
  jobDescription,
  onJobDescriptionChange,
  onGenerate,
  isBusy,
}: JobInputProps) {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [aiConfigs, setAiConfigs] = useState<OpenAiConfigRecord[]>([]);
  const [templateId, setTemplateId] = useState<number | undefined>(undefined);
  const [promptId, setPromptId] = useState<number | undefined>(undefined);
  const [aiConfigId, setAiConfigId] = useState<number | undefined>(undefined);

  useEffect(() => {
    const load = async () => {
      const [templatesResponse, promptsResponse, aiConfigsResponse] = await Promise.all([
        fetchTemplates(),
        fetchPrompts(),
        fetchOpenAiConfigs(),
      ]);
      setTemplates(templatesResponse.data);
      setPrompts(promptsResponse.data);
      setAiConfigs(aiConfigsResponse.data);
      const defaultTemplate = templatesResponse.data.find(
        (template) => template.isDefault
      );
      const defaultPrompt = promptsResponse.data.find(
        (prompt) => prompt.isDefault
      );
      const defaultAiConfig = aiConfigsResponse.data.find(
        (config) => config.isDefault
      );
      setTemplateId(defaultTemplate?.id);
      setPromptId(defaultPrompt?.id);
      setAiConfigId(defaultAiConfig?.id);
    };
    load();
  }, []);

  return (
    <Card className="border-neutral-800/80 bg-neutral-900/70">
      <CardHeader>
        <CardTitle>Job description</CardTitle>
        <CardDescription>
          Paste a role description and pick the resume template you want to
          optimize for.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Description
          </span>
          <Textarea
            placeholder="Paste the full job description here..."
            value={jobDescription}
            onChange={(event) => onJobDescriptionChange(event.target.value)}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Template
            <select
              className="h-11 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100"
              value={templateId ?? ""}
              onChange={(event) =>
                setTemplateId(event.target.value ? Number(event.target.value) : undefined)
              }
            >
              <option value="">Select template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            Prompt profile
            <select
              className="h-11 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100"
              value={promptId ?? ""}
              onChange={(event) =>
                setPromptId(event.target.value ? Number(event.target.value) : undefined)
              }
            >
              <option value="">Select prompt</option>
              {prompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-neutral-700">
            AI profile
            <select
              className="h-11 rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-neutral-100"
              value={aiConfigId ?? ""}
              onChange={(event) =>
                setAiConfigId(event.target.value ? Number(event.target.value) : undefined)
              }
            >
              <option value="">Default AI profile</option>
              {aiConfigs.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name} - {getProviderLabel(config.provider)} - {config.model}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button
          className="w-full md:w-auto"
          disabled={isBusy || !jobDescription.trim()}
          onClick={() => onGenerate({ templateId, promptId, aiConfigId })}
        >
          {isBusy ? "Generating..." : "Generate resume"}
        </Button>
      </CardContent>
    </Card>
  );
}
