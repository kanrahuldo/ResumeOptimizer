"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  "Queued",
  "Generating summary & bullets",
  "Validating formatting rules",
  "Uploading to GitHub",
  "Ready to review",
];

type OutputPanelProps = {
  statusLabel: string;
  statusVariant: "default" | "success" | "warning";
  outputUrl?: string;
  overleafUrl?: string;
  latexPreview?: string;
};

export function OutputPanel({
  statusLabel,
  statusVariant,
  outputUrl,
  overleafUrl,
  latexPreview,
}: OutputPanelProps) {
  return (
    <Card className="border-neutral-800/80 bg-neutral-900/70">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle>Resume output</CardTitle>
          <Badge variant={statusVariant}>{statusLabel}</Badge>
        </div>
        <CardDescription>
          Follow the pipeline status and grab the Overleaf link once the resume
          is generated.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-3 text-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-xs font-semibold text-neutral-300">
                {index + 1}
              </span>
              <span className="text-neutral-300">{step}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Button
            variant="secondary"
            disabled={!outputUrl}
            onClick={() => outputUrl && window.open(outputUrl, "_blank")}
          >
            View on GitHub
          </Button>
          <Button
            variant="secondary"
            disabled={!overleafUrl}
            onClick={() => overleafUrl && window.open(overleafUrl, "_blank")}
          >
            Open in Overleaf
          </Button>
        </div>
        <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/60 p-4 text-xs text-neutral-400">
          {latexPreview
            ? latexPreview.slice(0, 1200)
            : "LaTeX preview appears here after generation. Keep editing in Overleaf once the file is uploaded."}
        </div>
      </CardContent>
    </Card>
  );
}
