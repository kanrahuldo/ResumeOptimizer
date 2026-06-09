"use client";

import { useState } from "react";

import { JobInput } from "@/components/sections/job-input";
import { OutputPanel } from "@/components/sections/output-panel";

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

export function HomeDashboard() {
  const [jobDescription, setJobDescription] = useState("");
  const [statusLabel, setStatusLabel] = useState("Awaiting input");
  const [statusVariant, setStatusVariant] = useState<
    "default" | "success" | "warning"
  >("warning");
  const [isBusy, setIsBusy] = useState(false);
  const [outputUrl, setOutputUrl] = useState<string | undefined>(undefined);
  const [overleafUrl, setOverleafUrl] = useState<string | undefined>(undefined);
  const [latexPreview, setLatexPreview] = useState<string | undefined>(
    undefined
  );

  const handleGenerate = async (payload: {
    templateId?: number;
    promptId?: number;
  }) => {
    setIsBusy(true);
    setStatusLabel("Generating");
    setStatusVariant("warning");
    setOutputUrl(undefined);
    setOverleafUrl(undefined);
    setLatexPreview(undefined);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          templateId: payload.templateId,
          promptId: payload.promptId,
        }),
      });
      const json = (await response.json()) as GenerateResponse;

      if (!response.ok) {
        setStatusLabel("Needs attention");
        setStatusVariant("warning");
        setLatexPreview(json.details?.join("\n") || json.error || "Failed.");
        return;
      }

      setStatusLabel("Ready");
      setStatusVariant("success");
      setOutputUrl(json.data.outputUrl);
      setOverleafUrl(json.data.overleafUrl);
      setLatexPreview(json.data.latex);
    } catch (error) {
      setStatusLabel("Error");
      setStatusVariant("warning");
      setLatexPreview(
        error instanceof Error ? error.message : "Request failed."
      );
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <JobInput
        jobDescription={jobDescription}
        onJobDescriptionChange={setJobDescription}
        onGenerate={handleGenerate}
        isBusy={isBusy}
      />
      <OutputPanel
        statusLabel={statusLabel}
        statusVariant={statusVariant}
        outputUrl={outputUrl}
        overleafUrl={overleafUrl}
        latexPreview={latexPreview}
      />
    </section>
  );
}
