"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, PenLine, Trash2, Eye, EyeOff } from "lucide-react";

import {
  createGithubConfig,
  deleteGithubConfig,
  fetchGithubConfigs,
  setDefaultGithubConfig,
  updateGithubConfig,
  GithubConfigRecord,
} from "@/lib/api";
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

export function SettingsGithub() {
  const [configs, setConfigs] = useState<GithubConfigRecord[]>([]);
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [originalName, setOriginalName] = useState("");
  const [originalOwner, setOriginalOwner] = useState("");
  const [originalRepo, setOriginalRepo] = useState("");
  const [originalDefault, setOriginalDefault] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const { push } = useToast();

  const loadConfigs = async () => {
    try {
      const response = await fetchGithubConfigs();
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
      if (!name.trim() || !owner.trim() || !repo.trim()) {
        setError("Name, owner, and repo are required.");
        return;
      }
    if (!token.trim() && !hasToken) {
      setError("Token is required.");
      return;
    }
    setIsBusy(true);
    try {
      if (editingId) {
        await updateGithubConfig(editingId, {
          name: name.trim(),
          owner: owner.trim(),
          repo: repo.trim(),
          token: token.trim(),
        });
        push({ title: "GitHub profile updated.", variant: "success" });
      } else {
        await createGithubConfig({
          name: name.trim(),
          owner: owner.trim(),
          repo: repo.trim(),
          token: token.trim(),
          isDefault,
        });
        push({ title: "GitHub profile created.", variant: "success" });
      }
      setName("");
      setOwner("");
      setRepo("");
      setToken("");
      setIsDefault(false);
      setEditingId(null);
      setHasToken(false);
      await loadConfigs();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save config.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleEdit = (config: GithubConfigRecord) => {
    setEditingId(config.id);
    setName(config.name);
    setOwner(config.owner);
    setRepo(config.repo);
    setToken(config.token || "");
    setHasToken(Boolean(config.token));
    setIsDefault(config.isDefault);
    setOriginalName(config.name);
    setOriginalOwner(config.owner);
    setOriginalRepo(config.repo);
    setOriginalDefault(config.isDefault);
  };

  const handleCancel = () => {
    setEditingId(null);
    setName("");
    setOwner("");
    setRepo("");
    setToken("");
    setHasToken(false);
    setShowToken(false);
    setIsDefault(false);
    setOriginalName("");
    setOriginalOwner("");
    setOriginalRepo("");
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
      await deleteGithubConfig(id);
      if (editingId === id) {
        handleCancel();
      }
      await loadConfigs();
      push({ title: "GitHub profile deleted.", variant: "success" });
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
      await setDefaultGithubConfig(id);
      await loadConfigs();
      push({ title: "Default GitHub profile updated.", variant: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to set default.";
      setError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const handleTest = async (config?: GithubConfigRecord) => {
    setError(null);
    const nextOwner = owner.trim();
    const nextRepo = repo.trim();
    const nextToken = token.trim();
    if (!nextOwner || !nextRepo || (!nextToken && !hasToken)) {
      const message = "Fill owner, repo, and token before testing.";
      setError(message);
      push({ title: message, variant: "error" });
      return;
    }

    setIsBusy(true);
    try {
      const shouldUseStored = !nextToken && hasToken && editingId;
      const response = await fetch("/api/github/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: nextOwner,
          repo: nextRepo,
          ...(shouldUseStored
            ? { configId: editingId }
            : { token: nextToken }),
        }),
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        const message = json.error || "Connection failed.";
        push({ title: message, variant: "error" });
        return;
      }

      push({ title: "GitHub connection successful.", variant: "success" });
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
          <CardTitle>GitHub profiles</CardTitle>
          <CardDescription>
            Manage multiple repository targets and pick a default destination.
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
                  {config.owner}/{config.repo}
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
            <p className="text-sm text-slate-400">No GitHub profiles saved.</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle>
                {editingId ? "Edit GitHub profile" : "Add GitHub profile"}
              </CardTitle>
              <CardDescription>
                Store credentials securely for multiple repos.
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
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              placeholder="Owner"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
            />
            <Input
              placeholder="Repo"
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
            />
          </div>
          <div className="relative">
            <Input
              type={showToken ? "text" : "password"}
              placeholder="Token"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200 cursor-pointer"
              aria-label={showToken ? "Hide token" : "Show token"}
              title={showToken ? "Hide token" : "Show token"}
            >
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                handleTest();
              }}
              disabled={
                isBusy ||
                !owner.trim() ||
                !repo.trim() ||
                (!token.trim() && !hasToken)
              }
            >
              Test connection
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isBusy ||
                !name.trim() ||
                !owner.trim() ||
                !repo.trim() ||
                (!token.trim() && !hasToken) ||
                (editingId
                  ? name.trim() === originalName.trim() &&
                    owner.trim() === originalOwner.trim() &&
                    repo.trim() === originalRepo.trim() &&
                    !token.trim() &&
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
        title="Delete this GitHub profile?"
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
