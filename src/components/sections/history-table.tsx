"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Download, Eye, FileText, Github, Leaf, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteRun } from "@/lib/api";

type HistoryRow = {
  id: number;
  jobDescription: string;
  status: string;
  outputUrl?: string | null;
  overleafUrl?: string | null;
  createdAt: Date;
};

type HistoryTableProps = {
  rows: HistoryRow[];
};

export function HistoryTable({ rows }: HistoryTableProps) {
  const { push } = useToast();
  const [items, setItems] = useState(rows);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerText, setViewerText] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isPdfPreviewing, setIsPdfPreviewing] = useState(false);
  const [pdfFilename, setPdfFilename] = useState<string>("resume");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const portalRoot = useMemo(
    () => (typeof document !== "undefined" ? document.body : null),
    []
  );

  const handleDelete = async (id: number) => {
    try {
      await deleteRun(id);
      setItems((current) => current.filter((row) => row.id !== id));
      push({ title: "History item deleted.", variant: "success" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete history item.";
      push({ title: message, variant: "error" });
    }
  };

  const toRawGithubUrl = (url: string) => {
    if (url.includes("raw.githubusercontent.com")) return url;
    if (url.includes("github.com/")) {
      return url
        .replace("https://github.com/", "https://raw.githubusercontent.com/")
        .replace("/blob/", "/");
    }
    return url;
  };

  const closePdfPreview = () => {
    if (pdfUrl && pdfUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(null);
    setPdfTitle(null);
    setPdfFilename("resume");
    setPdfError(null);
    setPdfOpen(false);
  };

  const handlePdfPreview = async (row: HistoryRow) => {
    if (!row.outputUrl) {
      push({ title: "No GitHub file for this run.", variant: "error" });
      return;
    }
    setPdfError(null);
    const fileNameFromUrl = (() => {
      if (!row.outputUrl) return "resume";
      try {
        const url = new URL(row.outputUrl);
        const base = url.pathname.split("/").pop() || "resume";
        const withoutTex = base.endsWith(".tex") ? base.slice(0, -4) : base;
        return withoutTex.slice(0, -6);
      } catch {
        const base = row.outputUrl.split("/").pop() || "resume";
        const withoutTex = base.endsWith(".tex") ? base.slice(0, -4) : base;
        return withoutTex.slice(0, -6);
      }
    })();
    setPdfTitle(`${fileNameFromUrl}.pdf`);
    setPdfFilename(fileNameFromUrl);
    setPdfOpen(true);
    setIsPdfPreviewing(true);

    try {
      const rawUrl = toRawGithubUrl(row.outputUrl);
      const texResponse = await fetch(rawUrl);
      if (!texResponse.ok) {
        throw new Error("Failed to fetch LaTeX source from GitHub.");
      }
      const texContent = await texResponse.text();
      const previewResponse = await fetch("/api/latex/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: texContent, name: fileNameFromUrl }),
      });
      if (!previewResponse.ok) {
        const payload = (await previewResponse.json().catch(() => null)) as
          | { error?: string }
          | null;
        const message = payload?.error ?? "Failed to render preview.";
        throw new Error(message);
      }
      const blob = await previewResponse.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to render preview.";
      setPdfError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsPdfPreviewing(false);
    }
  };

  const handleDownloadPreview = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${pdfFilename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Card className="border-[#2a2f55] bg-[#111325]/80">
      <CardHeader>
        <CardTitle>Generation history</CardTitle>
        <CardDescription>
          Review recent resume outputs and open links from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[65vh] space-y-3 overflow-y-auto pr-2">
        {items.map((row) => (
          <div
            key={row.id}
            className="flex flex-col gap-2 rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="text-sm font-semibold text-slate-100">
                {row.jobDescription.slice(0, 60)}...
              </div>
              <div className="text-xs text-slate-400">
                {new Date(row.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {row.status != "ready" && (
                <Badge variant={row.status === "ready" ? "success" : "warning"}>
                  {row.status}
                </Badge> 
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewerText(row.jobDescription);
                  setViewerOpen(true);
                }}
                aria-label="View job description"
                title="View job description"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePdfPreview(row)}
                aria-label="Preview resume"
                title="Preview resume"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {row.outputUrl && (
                <a
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 bg-transparent text-neutral-200 hover:bg-violet-500/20 h-9 px-3 text-sm"
                  href={row.outputUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    push({ title: "Opening GitHub file...", variant: "success" })
                  }
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
              {row.overleafUrl && (
                <a
                  className="inline-flex text-teal-600 cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 bg-transparent text-neutral-200 hover:bg-violet-500/20 h-9 px-3 text-sm"
                  href={row.overleafUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    push({ title: "Opening Overleaf link...", variant: "success" })
                  }
                >
                  <Leaf className="h-4 w-4" />
                </a>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteId(row.id)}
                aria-label="Delete run"
                title="Delete"
                className="text-rose-300 hover:text-rose-200"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-slate-400">No runs yet.</p>
        )}
      </CardContent>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this history item?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => {
          if (confirmDeleteId !== null) {
            handleDelete(confirmDeleteId);
          }
          setConfirmDeleteId(null);
        }}
      />
      {pdfOpen && portalRoot
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closePdfPreview}
              />
              <div className="relative flex h-[90vh] w-[min(92vw,72rem)] flex-col overflow-hidden rounded-2xl border border-[#2a2f55] bg-[#0f1228] shadow-xl">
                <div className="flex items-center justify-between border-b border-[#1d2145] px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                      Resume preview
                    </p>
                    <h3 className="text-base font-semibold text-slate-100">
                      {pdfTitle ?? "Preview"}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadPreview}
                      aria-label="Download preview"
                      className="h-9 w-9"
                      disabled={!pdfUrl}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closePdfPreview}
                      aria-label="Close preview"
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden bg-[#0b1026]">
                  {isPdfPreviewing && (
                    <div className="flex h-full items-center justify-center text-sm text-slate-300">
                      Rendering preview...
                    </div>
                  )}
                  {pdfError && !isPdfPreviewing && (
                    <div className="flex h-full items-center justify-center text-sm text-rose-300">
                      {pdfError}
                    </div>
                  )}
                  {pdfUrl && !isPdfPreviewing && (
                    <iframe
                      title="Resume preview"
                      src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      className="h-full w-full border-0"
                    />
                  )}
                </div>
              </div>
            </div>,
            portalRoot
          )
        : null}
      {viewerOpen && portalRoot
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setViewerOpen(false)}
              />
              <div className="relative w-[min(92vw,64rem)] rounded-2xl border border-[#2a2f55] bg-[#0f1228] p-6 shadow-xl">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-slate-100">
                    Job description
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(viewerText).then(
                          () =>
                            push({
                              title: "Job description copied.",
                              variant: "success",
                            }),
                          () =>
                            push({ title: "Copy failed.", variant: "error" })
                        );
                      }}
                      aria-label="Copy job description"
                      className="h-9 w-9"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewerOpen(false)}
                      aria-label="Close preview"
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 max-h-[65vh] overflow-y-auto rounded-xl border border-[#2a2f55] bg-[#0b0f24] p-4 text-sm text-slate-200">
                  <p className="whitespace-pre-wrap">{viewerText}</p>
                </div>
              </div>
            </div>,
            portalRoot
          )
        : null}
    </Card>
  );
}
