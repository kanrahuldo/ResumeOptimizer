"use client";

import { useEffect, useState } from "react";

import {
  createPrompt,
  deletePrompt,
  fetchPrompts,
  setDefaultPrompt,
  updatePrompt,
  PromptRecord,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, PenLine, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function SettingsPrompt() {
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
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
  const { push } = useToast();

  const loadPrompts = async () => {
    try {
      const response = await fetchPrompts();
      setPrompts(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load prompts.";
      setError(message);
      push({ title: message, variant: "error" });
    }
  };

  useEffect(() => {
    loadPrompts();
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!name.trim() || !content.trim()) {
      const message = "Prompt name and content are required.";
      setError(message);
      push({ title: message, variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      if (editingId) {
        await updatePrompt(editingId, {
          name: name.trim(),
          content: content.trim(),
        });
        push({ title: "Prompt updated.", variant: "success" });
      } else {
        await createPrompt({
          name: name.trim(),
          content: content.trim(),
          isDefault,
        });
        push({ title: "Prompt created.", variant: "success" });
      }
      setName("");
      setContent("");
      setIsDefault(false);
      setEditingId(null);
      await loadPrompts();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save prompt.";
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
      await setDefaultPrompt(id);
      await loadPrompts();
      push({ title: "Default prompt updated.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set default.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleEdit = (prompt: PromptRecord) => {
    setEditingId(prompt.id);
    setName(prompt.name);
    setContent(prompt.content);
    setIsDefault(prompt.isDefault);
    setOriginalName(prompt.name);
    setOriginalContent(prompt.content);
    setOriginalDefault(prompt.isDefault);
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
    const target = prompts.find((item) => item.id === id);
    if (target?.isDefault) {
      const message = "Cannot delete the default prompt.";
      setError(message);
      push({ title: message, variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      await deletePrompt(id);
      if (editingId === id) {
        handleCancel();
      }
      await loadPrompts();
      push({ title: "Prompt deleted.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete prompt.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader>
          <CardTitle>Prompt profiles</CardTitle>
          <CardDescription>
            Swap prompt profiles without touching the workflow logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[520px] space-y-4 overflow-y-auto pr-2">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{prompt.name}</span>
                </div>
                <span className="text-xs text-slate-400">
                  Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {prompt.isDefault ? (
                  <Badge variant="success" className="mr-2">Default</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(prompt.id)}
                    aria-label="Set as default"
                    title="Set as default"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(prompt)}
                  aria-label="Edit prompt"
                  title="Edit"
                >
                  <PenLine className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDeleteId(prompt.id)}
                  aria-label="Delete prompt"
                  title="Delete"
                  disabled={isBusy}
                  className="text-rose-300 hover:text-rose-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {prompts.length === 0 && (
            <p className="text-sm text-slate-400">No prompts saved yet.</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>
                {editingId ? "Edit prompt profile" : "Create prompt profile"}
              </CardTitle>
              <CardDescription>
                Use your n8n instructions and tune the wording here.
              </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Prompt name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Textarea
            className="min-h-[520px]"
            placeholder="Paste the full prompt configuration..."
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
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
        title="Delete this prompt?"
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
    </div>
  );
}
