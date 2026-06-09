"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
  setDefaultTemplate,
  updateTemplate,
  TemplateRecord,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Download, Eye, EyeOff, PenLine, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function SettingsTemplates() {
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [originalDefault, setOriginalDefault] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState<string>("template");
  const [showEditorPreview, setShowEditorPreview] = useState(false);
  const [editorPreviewUrl, setEditorPreviewUrl] = useState<string | null>(null);
  const [editorPreviewError, setEditorPreviewError] = useState<string | null>(
    null
  );
  const [isEditorPreviewing, setIsEditorPreviewing] = useState(false);
  const { push } = useToast();
  const previewContainer = useMemo(
    () => (typeof document === "undefined" ? null : document.body),
    []
  );

  const loadTemplates = async () => {
    try {
      const response = await fetchTemplates();
      setTemplates(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load templates.";
      setError(message);
      push({ title: message, variant: "error" });
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !content.trim()) {
      setError("Template name and content are required.");
      return;
    }
    setIsBusy(true);
    try {
      if (editingId) {
        await updateTemplate(editingId, {
          name: name.trim(),
          content: content.trim(),
        });
        push({ title: "Template updated.", variant: "success" });
      } else {
        await createTemplate({
          name: name.trim(),
          content: content.trim(),
          isDefault,
        });
        push({ title: "Template created.", variant: "success" });
      }
      setName("");
      setContent("");
      setIsDefault(false);
      setEditingId(null);
      await loadTemplates();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save template.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setError(null);
    setIsBusy(true);
    try {
      await setDefaultTemplate(id);
      await loadTemplates();
      push({ title: "Default template updated.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set default.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleEdit = (template: TemplateRecord) => {
    setEditingId(template.id);
    setName(template.name);
    setContent(template.content);
    setIsDefault(template.isDefault);
    setOriginalName(template.name);
    setOriginalContent(template.content);
    setOriginalDefault(template.isDefault);
  };

  const handleCancel = () => {
    setEditingId(null);
    setName("");
    setContent("");
    setIsDefault(false);
    setOriginalName("");
    setOriginalContent("");
    setOriginalDefault(false);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const target = templates.find((item) => item.id === id);
    if (target?.isDefault) {
      const message = "Cannot delete the default template.";
      setError(message);
      push({ title: message, variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      await deleteTemplate(id);
      if (editingId === id) {
        handleCancel();
      }
      await loadTemplates();
      push({ title: "Template deleted.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete template.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const closePreview = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewTitle(null);
    setPreviewFilename("template");
    setPreviewError(null);
    setIsPreviewOpen(false);
  };

  const requestPreview = async (nextContent: string, nextName: string) => {
    const response = await fetch("/api/latex/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: nextContent,
        name: nextName,
      }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      const message = payload?.error ?? "Failed to render preview.";
      throw new Error(message);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const handlePreview = async (template: TemplateRecord) => {
    setPreviewError(null);
    setPreviewTitle(template.name);
    setPreviewFilename(
      template.name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 80) || "template"
    );
    setIsPreviewOpen(true);
    setIsPreviewing(true);

    try {
      const url = await requestPreview(template.content, template.name);
      setPreviewUrl(url);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to render preview.";
      setPreviewError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsPreviewing(false);
    }
  };

  const toggleEditorPreview = async () => {
    if (showEditorPreview) {
      setShowEditorPreview(false);
      return;
    }

    setEditorPreviewError(null);
    setShowEditorPreview(true);
    setIsEditorPreviewing(true);
    try {
      if (!content.trim()) {
        throw new Error("Paste LaTeX content to preview.");
      }
      const nextUrl = await requestPreview(
        content,
        name.trim() || "template"
      );
      if (editorPreviewUrl && editorPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(editorPreviewUrl);
      }
      setEditorPreviewUrl(nextUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to render preview.";
      setEditorPreviewError(message);
      push({ title: message, variant: "error" });
      setShowEditorPreview(false);
    } finally {
      setIsEditorPreviewing(false);
    }
  };

  const handleDownloadPreview = () => {
    if (!previewUrl) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `${previewFilename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader>
          <CardTitle>Template library</CardTitle>
          <CardDescription>
            Manage multiple LaTeX templates and set a default for generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[520px] space-y-4 overflow-y-auto pr-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {template.name}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  Updated {new Date(template.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {template.isDefault ? (
                  <Badge variant="success" className="mr-2">Default</Badge>
                  ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(template.id)}
                    aria-label="Set as default"
                    title="Set as default"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(template)}
                  aria-label="Preview template"
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(template)}
                  aria-label="Edit template"
                  title="Edit"
                >
                  <PenLine className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDeleteId(template.id)}
                  aria-label="Delete template"
                  title="Delete"
                  disabled={isBusy}
                  className="text-rose-300 hover:text-rose-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-sm text-slate-400">No templates saved yet.</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>
                {editingId ? "Edit template" : "Add new template"}
              </CardTitle>
              <CardDescription>
                Save a fresh LaTeX template for the optimizer.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleEditorPreview}
                aria-label={
                  showEditorPreview ? "Show LaTeX source" : "Show preview"
                }
                disabled={isEditorPreviewing || !content.trim()}
                className="border border-[#2a2f55] bg-[#0f1228]"
              >
                {showEditorPreview ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    <span className="text-xs">Show code</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">Preview</span>
                  </>
                )}
              </Button>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <span>Set as default</span>
                <span className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isDefault}
                    onChange={(event) => setIsDefault(event.target.checked)}
                    disabled={Boolean(editingId && isDefault)}
                  />
                  <span className="h-6 w-11 rounded-full border border-[#2a2f55] bg-[#0f1228] transition peer-checked:bg-indigo-500/70 peer-disabled:opacity-50" />
                  <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5 peer-disabled:opacity-60" />
                </span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Template name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {showEditorPreview ? (
            <div className="min-h-[520px] overflow-hidden rounded-xl border border-[#2a2f55] bg-[#0b1026]">
              {isEditorPreviewing && (
                <div className="flex h-full min-h-[520px] items-center justify-center text-sm text-slate-300">
                  Rendering preview...
                </div>
              )}
              {editorPreviewError && !isEditorPreviewing && (
                <div className="flex h-full min-h-[520px] items-center justify-center text-sm text-rose-300">
                  {editorPreviewError}
                </div>
              )}
              {editorPreviewUrl && !isEditorPreviewing && (
                <iframe
                  title="Template preview"
                  src={`${editorPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="h-[520px] w-full border-0"
                />
              )}
            </div>
          ) : (
            <Textarea
              className="min-h-[520px]"
              placeholder="Paste your LaTeX template here..."
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
          )}
          {error && (
            <p className="text-sm text-rose-400">{error}</p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={handleCreate}
              disabled={
                isBusy ||
                !name.trim() ||
                !content.trim() ||
                (editingId
                  ? name.trim() === originalName.trim() &&
                    content.trim() === originalContent.trim() &&
                    isDefault === originalDefault
                  : false)
              }
            >
              {editingId ? "Update" : "Save"}
            </Button>
            {editingId && (
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={isBusy}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this template?"
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
      {previewContainer &&
        isPreviewOpen &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6">
            <div className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#2a2f55] bg-[#0c1024] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#1d2145] px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Template preview
                  </p>
                  <h3 className="text-base font-semibold text-slate-100">
                    {previewTitle ?? "Preview"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadPreview}
                    aria-label="Download preview"
                    className="h-9 w-9"
                    disabled={!previewUrl}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closePreview}
                    aria-label="Close preview"
                    className="h-9 w-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-[#0b1026]">
                {isPreviewing && (
                  <div className="flex h-full items-center justify-center text-sm text-slate-300">
                    Rendering preview...
                  </div>
                )}
                {previewError && !isPreviewing && (
                  <div className="flex h-full items-center justify-center text-sm text-rose-300">
                    {previewError}
                  </div>
                )}
                {previewUrl && !isPreviewing && (
                  <iframe
                    title="Template preview"
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="h-full w-full border-0"
                  />
                )}
              </div>
            </div>
          </div>,
          previewContainer
        )}
    </div>
  );
}
