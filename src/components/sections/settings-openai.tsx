"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, PenLine, Trash2, Eye, EyeOff } from "lucide-react";

import {
  createOpenAiConfig,
  deleteOpenAiConfig,
  fetchOpenAiConfigs,
  setDefaultOpenAiConfig,
  updateOpenAiConfig,
  OpenAiConfigRecord,
} from "@/lib/api";
import {
  AI_PROVIDERS,
  getProviderBaseUrl,
  getProviderModels,
} from "@/lib/ai-providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SettingsOpenAI() {
  const [configs, setConfigs] = useState<OpenAiConfigRecord[]>([]);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [originalProvider, setOriginalProvider] = useState("openai");
  const [originalModel, setOriginalModel] = useState("");
  const [originalBaseUrl, setOriginalBaseUrl] = useState("");
  const [originalDefault, setOriginalDefault] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const { push } = useToast();
  const providerModels = getProviderModels(provider);
  const selectedModelValue = providerModels.some((item) => item.id === model)
    ? model
    : "__custom";

  const loadConfigs = async () => {
    try {
      const response = await fetchOpenAiConfigs();
      setConfigs(response.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load configs.";
      setError(message);
      push({ title: message, variant: "error" });
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSave = async () => {
    setError(null);
    if (!name.trim() || !model.trim()) {
      setError("Name and model are required.");
      return;
    }
    if (!apiKey.trim() && !hasKey) {
      setError("API key is required.");
      return;
    }
    setIsBusy(true);
    try {
      if (editingId) {
        await updateOpenAiConfig(editingId, {
          name: name.trim(),
          provider,
          apiKey: apiKey.trim(),
          model: model.trim(),
          baseUrl: baseUrl.trim(),
        });
        push({ title: "AI profile updated.", variant: "success" });
      } else {
        await createOpenAiConfig({
          name: name.trim(),
          provider,
          apiKey: apiKey.trim(),
          model: model.trim(),
          baseUrl: baseUrl.trim(),
          isDefault,
        });
        push({ title: "AI profile created.", variant: "success" });
      }
      setName("");
      setProvider("openai");
      setApiKey("");
      setModel("");
      setBaseUrl("");
      setIsDefault(false);
      setEditingId(null);
      setHasKey(false);
      await loadConfigs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save config.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleEdit = (config: OpenAiConfigRecord) => {
    setEditingId(config.id);
    setName(config.name);
    setProvider(config.provider || "openai");
    setApiKey(config.apiKey || "");
    setHasKey(Boolean(config.apiKey));
    setModel(config.model);
    setBaseUrl(config.baseUrl || "");
    setIsDefault(config.isDefault);
    setOriginalName(config.name);
    setOriginalProvider(config.provider || "openai");
    setOriginalModel(config.model);
    setOriginalBaseUrl(config.baseUrl || "");
    setOriginalDefault(config.isDefault);
  };

  const handleCancel = () => {
    setEditingId(null);
    setName("");
    setProvider("openai");
    setApiKey("");
    setHasKey(false);
    setModel("");
    setBaseUrl("");
    setIsDefault(false);
    setShowKey(false);
    setOriginalName("");
    setOriginalProvider("openai");
    setOriginalModel("");
    setOriginalBaseUrl("");
    setOriginalDefault(false);
    setError(null);
  };

  const handleDelete = async (id: number) => {
    setError(null);
    const target = configs.find((item) => item.id === id);
    if (target?.isDefault && configs.length > 1) {
      const message = "Set another default before deleting this profile.";
      setError(message);
      push({ title: message, variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      await deleteOpenAiConfig(id);
      if (editingId === id) {
        handleCancel();
      }
      await loadConfigs();
      push({ title: "AI profile deleted.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete config.";
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
      await setDefaultOpenAiConfig(id);
      await loadConfigs();
      push({ title: "Default AI profile updated.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set default.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleTest = async (_config?: OpenAiConfigRecord) => {
    setError(null);
    const nextApiKey = apiKey.trim();
    const nextModel = model.trim();
    const nextBaseUrl = baseUrl.trim();
    if ((!nextApiKey && !hasKey) || !nextModel) {
      const message = "Fill model and API key before testing.";
      setError(message);
      push({ title: message, variant: "error" });
      return;
    }

    setIsBusy(true);
    try {
      const response = await fetch("/api/openai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          !nextApiKey && hasKey && editingId
            ? { configId: editingId, model: nextModel, provider, baseUrl: nextBaseUrl }
            : { apiKey: nextApiKey, model: nextModel, provider, baseUrl: nextBaseUrl }
        ),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        const message = json.error || "Connection failed.";
        push({ title: message, variant: "error" });
        return;
      }

      push({ title: "AI connection successful.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed.";
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader>
          <CardTitle>AI profiles</CardTitle>
          <CardDescription>
            Store provider keys and models with a default profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[520px] space-y-4 overflow-y-auto pr-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{config.name}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {AI_PROVIDERS.find((item) => item.id === config.provider)?.label || config.provider} - {config.model}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {config.isDefault ? (
                  <Badge variant="success" className="mr-2">Default</Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(config.id)}
                    aria-label="Set as default"
                    title="Set as default"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(config)}
                  aria-label="Edit config"
                  title="Edit"
                >
                  <PenLine className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDeleteId(config.id)}
                  aria-label="Delete config"
                  title="Delete"
                  disabled={isBusy}
                  className="text-rose-300 hover:text-rose-200"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {configs.length === 0 && (
            <p className="text-sm text-slate-400">No AI profiles saved.</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>
                {editingId ? "Edit AI profile" : "Add AI profile"}
              </CardTitle>
              <CardDescription>
                Save API key, provider, and default model for this profile.
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
            placeholder="Profile name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <select
            className="h-11 w-full rounded-xl border border-[#2a2f55] bg-[#0f1228] px-4 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
            value={provider}
            onChange={(event) => {
              const nextProvider = event.target.value;
              const nextModels = getProviderModels(nextProvider);
              setProvider(nextProvider);
              setBaseUrl(getProviderBaseUrl(nextProvider, "") || "");
              setModel(nextModels[0]?.id || "");
            }}
          >
            {AI_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              placeholder="API key"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowKey((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200 cursor-pointer"
              aria-label={showKey ? "Hide key" : "Show key"}
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <select
            className="h-11 w-full rounded-xl border border-[#2a2f55] bg-[#0f1228] px-4 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
            value={selectedModelValue}
            onChange={(event) => {
              const nextModel = event.target.value;
              setModel(nextModel === "__custom" ? "" : nextModel);
            }}
          >
            {providerModels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}{"thinking" in item && item.thinking ? " (thinking)" : ""}
              </option>
            ))}
            <option value="__custom">Custom model ID</option>
          </select>
          {selectedModelValue === "__custom" && (
            <Input
              placeholder="Custom model ID"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
          )}
          <Input
            placeholder="Base URL (optional for listed providers)"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                handleTest();
              }}
              disabled={
                isBusy ||
                !model.trim() ||
                (!apiKey.trim() && !hasKey)
              }
            >
              Test connection
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isBusy ||
                !name.trim() ||
                !model.trim() ||
                (!apiKey.trim() && !hasKey) ||
                (editingId
                  ? name.trim() === originalName.trim() &&
                    provider === originalProvider &&
                    model.trim() === originalModel.trim() &&
                    baseUrl.trim() === originalBaseUrl.trim() &&
                    !apiKey.trim() &&
                    isDefault === originalDefault
                  : false)
              }
            >
              {editingId ? "Update" : "Save"}
            </Button>
            {editingId ? (
              <Button variant="secondary" onClick={handleCancel} disabled={isBusy}>
                Cancel
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this AI profile?"
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
