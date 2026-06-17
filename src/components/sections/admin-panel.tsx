"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Eye,
  FileText,
  Github,
  Leaf,
  Copy,
  ChevronDown,
  PenLine,
  Trash2,
  UserRound,
  EyeOff,
  X,
} from "lucide-react";

import {
  AdminGithubConfig,
  AdminOpenAiConfig,
  AdminPrompt,
  AdminRun,
  AdminTemplate,
  AdminUser,
  createAdminGithubConfig,
  createAdminOpenAiConfig,
  createAdminPrompt,
  createAdminTemplate,
  createAdminUser,
  deleteAdminGithubConfig,
  deleteAdminOpenAiConfig,
  deleteAdminPrompt,
  deleteAdminRun,
  deleteAdminTemplate,
  deleteAdminUser,
  fetchAdminGithubConfigs,
  fetchAdminOpenAiConfigs,
  fetchAdminPrompts,
  fetchAdminRuns,
  fetchAdminTemplates,
  fetchAdminUsers,
  updateAdminGithubConfig,
  updateAdminOpenAiConfig,
  updateAdminPrompt,
  updateAdminTemplate,
  updateAdminUser,
} from "@/lib/admin-api";
import {
  AI_PROVIDERS,
  getProviderBaseUrl,
  getProviderModels,
} from "@/lib/ai-providers";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type AdminTab = "templates" | "prompts" | "github" | "openai" | "runs";

export function AdminPanel() {
  const { push } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("templates");
  const [search, setSearch] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const [userForm, setUserForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    roleId: "1",
  });

  const [githubConfigs, setGithubConfigs] = useState<AdminGithubConfig[]>([]);
  const [openaiConfigs, setOpenaiConfigs] = useState<AdminOpenAiConfig[]>([]);
  const [runs, setRuns] = useState<AdminRun[]>([]);
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);

  const [githubForm, setGithubForm] = useState({
    id: 0,
    name: "",
    owner: "",
    repo: "",
    token: "",
    isDefault: false,
  });
  const [openaiForm, setOpenaiForm] = useState({
    id: 0,
    name: "",
    provider: "openai",
    apiKey: "",
    model: "",
    baseUrl: "",
    isDefault: false,
  });
  const [templateForm, setTemplateForm] = useState({
    id: 0,
    name: "",
    content: "",
    isDefault: false,
  });
  const [promptForm, setPromptForm] = useState({
    id: 0,
    name: "",
    content: "",
    isDefault: false,
  });
  const [showTemplateEditorPreview, setShowTemplateEditorPreview] = useState(false);
  const [templateEditorPreviewUrl, setTemplateEditorPreviewUrl] = useState<
    string | null
  >(null);
  const [templateEditorPreviewError, setTemplateEditorPreviewError] = useState<
    string | null
  >(null);
  const [isTemplateEditorPreviewing, setIsTemplateEditorPreviewing] =
    useState(false);

  const [showGithubToken, setShowGithubToken] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const openAiProviderModels = getProviderModels(openaiForm.provider);
  const selectedOpenAiModelValue = openAiProviderModels.some(
    (item) => item.id === openaiForm.model
  )
    ? openaiForm.model
    : "__custom";
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [confirmDeleteConfigId, setConfirmDeleteConfigId] = useState<number | null>(null);
  const [confirmDeleteOpenAiId, setConfirmDeleteOpenAiId] = useState<number | null>(null);
  const [confirmDeleteRunId, setConfirmDeleteRunId] = useState<number | null>(null);
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<number | null>(null);
  const [confirmDeletePromptId, setConfirmDeletePromptId] = useState<number | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerText, setViewerText] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isPdfPreviewing, setIsPdfPreviewing] = useState(false);
  const [pdfFilename, setPdfFilename] = useState<string>("resume");
  const portalRoot = useMemo(
    () => (typeof document !== "undefined" ? document.body : null),
    []
  );

  const selectedUser = users.find((user) => user.id === selectedUserId) || null;

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.email].some((value) =>
        value?.toLowerCase().includes(term)
      )
    );
  }, [search, users]);

  const loadUsers = async () => {
    try {
      const response = await fetchAdminUsers();
      setUsers(response.data);
      if (selectedUserId) {
        const stillExists = response.data.some((user) => user.id === selectedUserId);
        if (!stillExists) {
          setSelectedUserId(null);
        }
      }
    } catch (error) {
      push({
        title: error instanceof Error ? error.message : "Failed to load users.",
        variant: "error",
      });
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      const [
        templatesResponse,
        promptsResponse,
        githubResponse,
        openaiResponse,
        runsResponse,
      ] = await Promise.all([
        fetchAdminTemplates(userId),
        fetchAdminPrompts(userId),
        fetchAdminGithubConfigs(userId),
        fetchAdminOpenAiConfigs(userId),
        fetchAdminRuns(userId),
      ]);
      setTemplates(templatesResponse.data);
      setPrompts(promptsResponse.data);
      setGithubConfigs(githubResponse.data);
      setOpenaiConfigs(openaiResponse.data);
      setRuns(runsResponse.data);
    } catch (error) {
      push({
        title:
          error instanceof Error
            ? error.message
            : "Failed to load user data.",
        variant: "error",
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    loadUserData(selectedUserId);
    const user = users.find((item) => item.id === selectedUserId);
    if (user) {
      setUserForm({
        id: user.id,
        name: user.name,
        email: user.email,
        password: "",
        roleId: String(user.roleId ?? 1),
      });
    }
    setGithubForm({ id: 0, name: "", owner: "", repo: "", token: "", isDefault: false });
    setOpenaiForm({ id: 0, name: "", provider: "openai", apiKey: "", model: "", baseUrl: "", isDefault: false });
    setTemplateForm({ id: 0, name: "", content: "", isDefault: false });
    setPromptForm({ id: 0, name: "", content: "", isDefault: false });
    setShowTemplateEditorPreview(false);
    setTemplateEditorPreviewError(null);
    if (templateEditorPreviewUrl && templateEditorPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(templateEditorPreviewUrl);
    }
    setTemplateEditorPreviewUrl(null);
  }, [selectedUserId, users]);

  useEffect(() => {
    if (!selectedUserId) {
      setUserForm({ id: "", name: "", email: "", password: "", roleId: "1" });
      setGithubConfigs([]);
      setOpenaiConfigs([]);
      setRuns([]);
      setTemplates([]);
      setPrompts([]);
      setGithubForm({ id: 0, name: "", owner: "", repo: "", token: "", isDefault: false });
      setOpenaiForm({ id: 0, name: "", provider: "openai", apiKey: "", model: "", baseUrl: "", isDefault: false });
      setTemplateForm({ id: 0, name: "", content: "", isDefault: false });
      setPromptForm({ id: 0, name: "", content: "", isDefault: false });
      setShowTemplateEditorPreview(false);
      setTemplateEditorPreviewError(null);
      if (templateEditorPreviewUrl && templateEditorPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(templateEditorPreviewUrl);
      }
      setTemplateEditorPreviewUrl(null);
    }
  }, [selectedUserId]);

  const handleUserSave = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) {
      push({ title: "Name and email are required.", variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      if (userForm.id) {
        await updateAdminUser(userForm.id, {
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          roleId: Number(userForm.roleId),
          ...(userForm.password ? { password: userForm.password } : {}),
        });
        push({ title: "User updated.", variant: "success" });
      } else {
        if (!userForm.password) {
          push({ title: "Password is required for new users.", variant: "error" });
          return;
        }
        await createAdminUser({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          roleId: Number(userForm.roleId),
        });
        push({ title: "User created.", variant: "success" });
      }
      setUserForm({ id: "", name: "", email: "", password: "", roleId: "1" });
      await loadUsers();
    } catch (error) {
      push({
        title: error instanceof Error ? error.message : "Failed to save user.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsBusy(true);
    try {
      await deleteAdminUser(userId);
      push({ title: "User deleted.", variant: "success" });
      setSelectedUserId((prev) => (prev === userId ? null : prev));
      await loadUsers();
    } catch (error) {
      push({
        title: error instanceof Error ? error.message : "Failed to delete user.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleGithubSave = async () => {
    if (!selectedUserId) return;
    if (!githubForm.name.trim() || !githubForm.owner.trim() || !githubForm.repo.trim()) {
      push({ title: "Name, owner, and repo are required.", variant: "error" });
      return;
    }
    if (!githubForm.token.trim() && !githubForm.id) {
      push({ title: "Token is required.", variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      if (githubForm.id) {
        await updateAdminGithubConfig(githubForm.id, {
          name: githubForm.name.trim(),
          owner: githubForm.owner.trim(),
          repo: githubForm.repo.trim(),
          token: githubForm.token.trim() || undefined,
        });
        push({ title: "GitHub config updated.", variant: "success" });
      } else {
        await createAdminGithubConfig(selectedUserId, {
          name: githubForm.name.trim(),
          owner: githubForm.owner.trim(),
          repo: githubForm.repo.trim(),
          token: githubForm.token.trim(),
          isDefault: githubForm.isDefault,
        });
        push({ title: "GitHub config created.", variant: "success" });
      }
      setGithubForm({ id: 0, name: "", owner: "", repo: "", token: "", isDefault: false });
      await loadUserData(selectedUserId);
    } catch (error) {
      push({
        title:
          error instanceof Error ? error.message : "Failed to save GitHub config.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleOpenAiSave = async () => {
    if (!selectedUserId) return;
    if (!openaiForm.name.trim() || !openaiForm.model.trim()) {
      push({ title: "Name and model are required.", variant: "error" });
      return;
    }
    if (!openaiForm.apiKey.trim() && !openaiForm.id) {
      push({ title: "API key is required.", variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      if (openaiForm.id) {
        await updateAdminOpenAiConfig(openaiForm.id, {
          name: openaiForm.name.trim(),
          provider: openaiForm.provider,
          model: openaiForm.model.trim(),
          baseUrl: openaiForm.baseUrl.trim(),
          apiKey: openaiForm.apiKey.trim() || undefined,
        });
        push({ title: "AI config updated.", variant: "success" });
      } else {
        await createAdminOpenAiConfig(selectedUserId, {
          name: openaiForm.name.trim(),
          provider: openaiForm.provider,
          apiKey: openaiForm.apiKey.trim(),
          model: openaiForm.model.trim(),
          baseUrl: openaiForm.baseUrl.trim(),
          isDefault: openaiForm.isDefault,
        });
        push({ title: "AI config created.", variant: "success" });
      }
      setOpenaiForm({ id: 0, name: "", provider: "openai", apiKey: "", model: "", baseUrl: "", isDefault: false });
      await loadUserData(selectedUserId);
    } catch (error) {
      push({
        title:
          error instanceof Error ? error.message : "Failed to save AI config.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
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

  const handleDownloadPreview = () => {
    if (!pdfUrl) return;
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${pdfFilename}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleTemplatePreview = async (template: AdminTemplate) => {
    setPdfError(null);
    const safeName =
      template.name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 80) || "template";
    setPdfTitle(`${safeName}.pdf`);
    setPdfFilename(safeName);
    setPdfOpen(true);
    setIsPdfPreviewing(true);
    try {
      const url = await requestPreview(template.content, template.name);
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

  const handleRunPreview = async (run: AdminRun) => {
    setPdfError(null);
    const fileNameFromUrl = (() => {
      try {
        const url = new URL(run.outputUrl ?? "");
        const base = url.pathname.split("/").pop() || "resume";
        const withoutTex = base.endsWith(".tex") ? base.slice(0, -4) : base;
        return withoutTex.slice(0, -6);
      } catch {
        const base = (run.outputUrl ?? "").split("/").pop() || "resume";
        const withoutTex = base.endsWith(".tex") ? base.slice(0, -4) : base;
        return withoutTex.slice(0, -6);
      }
    })();
    setPdfTitle(`${fileNameFromUrl}.pdf`);
    setPdfFilename(fileNameFromUrl);
    setPdfOpen(true);
    setIsPdfPreviewing(true);

    try {
      const previewResponse = await fetch(`/api/admin/runs/${run.id}/preview`);
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
      if (run.overleafUrl) {
        setPdfOpen(false);
        window.open(run.overleafUrl, "_blank", "noopener,noreferrer");
        push({
          title: "Opening Overleaf preview instead.",
          variant: "success",
        });
        return;
      }
      setPdfError(message);
      push({ title: message, variant: "error" });
    } finally {
      setIsPdfPreviewing(false);
    }
  };

  const handleTemplateSave = async () => {
    if (!selectedUserId) return;
    if (!templateForm.name.trim() || !templateForm.content.trim()) {
      push({ title: "Name and content are required.", variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      if (templateForm.id) {
        await updateAdminTemplate(templateForm.id, {
          name: templateForm.name.trim(),
          content: templateForm.content.trim(),
        });
        push({ title: "Template updated.", variant: "success" });
      } else {
        await createAdminTemplate(selectedUserId, {
          name: templateForm.name.trim(),
          content: templateForm.content.trim(),
          isDefault: templateForm.isDefault,
        });
        push({ title: "Template created.", variant: "success" });
      }
      setTemplateForm({ id: 0, name: "", content: "", isDefault: false });
      setShowTemplateEditorPreview(false);
      setTemplateEditorPreviewError(null);
      if (templateEditorPreviewUrl && templateEditorPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(templateEditorPreviewUrl);
      }
      setTemplateEditorPreviewUrl(null);
      await loadUserData(selectedUserId);
    } catch (error) {
      push({
        title:
          error instanceof Error ? error.message : "Failed to save template.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  };

  const toggleTemplateEditorPreview = async () => {
    if (showTemplateEditorPreview) {
      setShowTemplateEditorPreview(false);
      return;
    }

    setTemplateEditorPreviewError(null);
    setShowTemplateEditorPreview(true);
    setIsTemplateEditorPreviewing(true);
    try {
      const nextUrl = await requestPreview(
        templateForm.content,
        templateForm.name.trim() || "template"
      );
      if (templateEditorPreviewUrl && templateEditorPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(templateEditorPreviewUrl);
      }
      setTemplateEditorPreviewUrl(nextUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to render preview.";
      setTemplateEditorPreviewError(message);
      push({ title: message, variant: "error" });
      setShowTemplateEditorPreview(false);
    } finally {
      setIsTemplateEditorPreviewing(false);
    }
  };

  const handlePromptSave = async () => {
    if (!selectedUserId) return;
    if (!promptForm.name.trim() || !promptForm.content.trim()) {
      push({ title: "Name and content are required.", variant: "error" });
      return;
    }
    setIsBusy(true);
    try {
      if (promptForm.id) {
        await updateAdminPrompt(promptForm.id, {
          name: promptForm.name.trim(),
          content: promptForm.content.trim(),
        });
        push({ title: "Prompt updated.", variant: "success" });
      } else {
        await createAdminPrompt(selectedUserId, {
          name: promptForm.name.trim(),
          content: promptForm.content.trim(),
          isDefault: promptForm.isDefault,
        });
        push({ title: "Prompt created.", variant: "success" });
      }
      setPromptForm({ id: 0, name: "", content: "", isDefault: false });
      await loadUserData(selectedUserId);
    } catch (error) {
      push({
        title: error instanceof Error ? error.message : "Failed to save prompt.",
        variant: "error",
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.5fr]">
      <div className="space-y-6">
        <Card className="border-[#2a2f55] bg-[#111325]/80">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>User directory</CardTitle>
                <CardDescription>
                  Search and manage users.
                </CardDescription>
              </div>
              <Input
                placeholder="Search users"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-9 w-full sm:w-56"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[400px] space-y-2 overflow-y-auto pr-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => setSelectedUserId(user.id)}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition cursor-pointer ${
                    user.id === selectedUserId
                      ? "border-violet-500/60 bg-violet-500/10"
                      : "border-[#2a2f55] bg-[#0f1228] hover:bg-violet-500/5"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{user.name}</span>
                      {user.roleId === 2 && (
                        <Badge variant="success">Admin</Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{user.email}</span>
                  </div>
                  <UserRound className="h-4 w-4 text-slate-400" />
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-sm text-slate-400">No users found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#2a2f55] bg-[#111325]/80">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>{userForm.id ? "Edit" : "Add"}</CardTitle>
                <CardDescription>Update user profile or create a new one.</CardDescription>
              </div>
              {userForm.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-300 hover:text-rose-200 border border-red-400/60 !bg-red-500/10"
                  onClick={() => setConfirmDeleteUserId(userForm.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm">Delete</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <Input
                placeholder="Full name"
                value={userForm.name}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <Input
                placeholder="Email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-3">
              <Input
                placeholder={userForm.id ? "New password (optional)" : "Password"}
                type="password"
                value={userForm.password}
                onChange={(event) =>
                  setUserForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              <div className="relative">
                <select
                  className="h-10 w-full appearance-none rounded-xl border border-[#2a2f55] bg-[#111633] px-3 pr-10 text-sm text-slate-100 cursor-pointer"
                  value={userForm.roleId}
                  onChange={(event) =>
                    setUserForm((prev) => ({
                      ...prev,
                      roleId: event.target.value,
                    }))
                  }
                >
                  <option value="1">User</option>
                  <option value="2">Admin</option>
                </select>
                <ChevronDown className="cursor-pointer absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setUserForm({ id: "", name: "", email: "", password: "", roleId: "1" });
                  setSelectedUserId(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUserSave} disabled={isBusy}>
                {userForm.id ? "Update" : "Create"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[#2a2f55] bg-[#111325]/80">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>User resources</CardTitle>
            <div className="inline-flex flex-wrap gap-2 rounded-full border border-[#2a2f55] bg-[#0f1228]/80 p-2">
              {(["templates", "prompts", "github", "openai", "runs"] as AdminTab[]).map(
                (tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? "primary" : "ghost"}
                    size="sm"
                    className={activeTab === tab ? "" : "text-slate-300"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "templates"
                      ? "Templates"
                      : tab === "prompts"
                        ? "Prompts"
                        : tab === "github"
                          ? "GitHub"
                          : tab === "openai"
                            ? "AI"
                            : "Runs"}
                  </Button>
                )
              )}
            </div>
          </div>
          <CardDescription>
            Manage saved credentials and history for the selected user.
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-6">
            {!selectedUser && (
              <p className="text-sm text-slate-400">Select a user to manage resources.</p>
            )}

            {selectedUser && activeTab === "templates" && (
              <div className="flex gap-2">
                <div className="max-h-[640px] space-y-2 overflow-y-auto pr-2 w-1/3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{template.name}</span>
                          {template.isDefault && <Badge variant="success">Default</Badge>}
                        </div>
                        <span className="text-xs text-slate-400">
                          Updated {new Date(template.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTemplatePreview(template)}
                          aria-label="Preview template"
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTemplateForm({
                              id: template.id,
                              name: template.name,
                              content: template.content,
                              isDefault: template.isDefault,
                            })
                          }
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-300 hover:text-rose-200"
                          onClick={() => setConfirmDeleteTemplateId(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-sm text-slate-400">No templates found.</p>
                  )}
                </div>
                <div className="space-y-2 w-2/3">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                    <Input
                      placeholder="Template name"
                      value={templateForm.name}
                      onChange={(event) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleTemplateEditorPreview}
                      aria-label={
                        showTemplateEditorPreview
                          ? "Show LaTeX source"
                          : "Show preview"
                      }
                      disabled={
                        isTemplateEditorPreviewing || !templateForm.content.trim()
                      }
                      className="border border-[#2a2f55] bg-[#0f1228]"
                    >
                      {showTemplateEditorPreview ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          <span className="text-xs">Code</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          <span className="text-xs">Preview</span>
                        </>
                      )}
                    </Button>
                    </div>
                    {showTemplateEditorPreview ? (
                      <div className="min-h-[520px] overflow-hidden rounded-xl border border-[#2a2f55] bg-[#0b1026]">
                        {isTemplateEditorPreviewing && (
                          <div className="flex h-full min-h-[520px] items-center justify-center text-sm text-slate-300">
                            Rendering preview...
                          </div>
                        )}
                        {templateEditorPreviewError &&
                          !isTemplateEditorPreviewing && (
                            <div className="flex h-full min-h-[520px] items-center justify-center text-sm text-rose-300">
                              {templateEditorPreviewError}
                            </div>
                          )}
                        {templateEditorPreviewUrl &&
                          !isTemplateEditorPreviewing && (
                            <iframe
                              title="Template preview"
                              src={`${templateEditorPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                              className="h-[520px] w-full border-0"
                            />
                          )}
                      </div>
                    ) : (
                      <Textarea
                        placeholder="Template content"
                        value={templateForm.content}
                        onChange={(event) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            content: event.target.value,
                          }))
                        }
                        className="min-h-[520px]"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        {
                          setTemplateForm({
                            id: 0,
                            name: "",
                            content: "",
                            isDefault: false,
                          });
                          setShowTemplateEditorPreview(false);
                          setTemplateEditorPreviewError(null);
                          if (
                            templateEditorPreviewUrl &&
                            templateEditorPreviewUrl.startsWith("blob:")
                          ) {
                            URL.revokeObjectURL(templateEditorPreviewUrl);
                          }
                          setTemplateEditorPreviewUrl(null);
                        }
                      }
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleTemplateSave} disabled={isBusy}>
                      {templateForm.id ? "Update template" : "Add template"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedUser && activeTab === "prompts" && (
              <div className="flex gap-2">
                <div className="max-h-[640px] space-y-2 overflow-y-auto pr-2 w-1/3">
                  {prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{prompt.name}</span>
                          {prompt.isDefault && <Badge variant="success">Default</Badge>}
                        </div>
                        <span className="text-xs text-slate-400">
                          Updated {new Date(prompt.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setPromptForm({
                              id: prompt.id,
                              name: prompt.name,
                              content: prompt.content,
                              isDefault: prompt.isDefault,
                            })
                          }
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-300 hover:text-rose-200"
                          onClick={() => setConfirmDeletePromptId(prompt.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {prompts.length === 0 && (
                    <p className="text-sm text-slate-400">No prompts found.</p>
                  )}
                </div>
                <div className="space-y-2 w-2/3">
                  <div className="grid gap-3">
                    <Input
                      placeholder="Prompt name"
                      value={promptForm.name}
                      onChange={(event) =>
                        setPromptForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                    />
                    <Textarea
                      placeholder="Prompt content"
                      value={promptForm.content}
                      onChange={(event) =>
                        setPromptForm((prev) => ({
                          ...prev,
                          content: event.target.value,
                        }))
                      }
                      className="min-h-[520px]"
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setPromptForm({ id: 0, name: "", content: "", isDefault: false })
                      }
                    >
                      Cancel
                    </Button>
                    <Button onClick={handlePromptSave} disabled={isBusy}>
                      {promptForm.id ? "Update prompt" : "Add prompt"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedUser && activeTab === "github" && (
              <div className="flex gap-2">
                <div className="max-h-[640px] space-y-2 overflow-y-auto pr-2 w-1/2">
                  {githubConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{config.name}</span>
                          {config.isDefault && <Badge variant="success">Default</Badge>}
                        </div>
                        <span className="text-xs text-slate-400">
                          {config.owner}/{config.repo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setGithubForm({
                              id: config.id,
                              name: config.name,
                              owner: config.owner,
                              repo: config.repo,
                              token: config.token,
                              isDefault: config.isDefault,
                            })
                          }
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-300 hover:text-rose-200"
                          onClick={() => setConfirmDeleteConfigId(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {githubConfigs.length === 0 && (
                    <p className="text-sm text-slate-400">No GitHub configs.</p>
                  )}
                </div>
                <div className="space-y-2 w-1/2">
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="Profile name"
                      value={githubForm.name}
                      onChange={(event) =>
                        setGithubForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Owner"
                      value={githubForm.owner}
                      onChange={(event) =>
                        setGithubForm((prev) => ({ ...prev, owner: event.target.value }))
                      }
                    />
                    <Input
                      placeholder="Repo"
                      value={githubForm.repo}
                      onChange={(event) =>
                        setGithubForm((prev) => ({ ...prev, repo: event.target.value }))
                      }
                    />
                    <div className="relative">
                      <Input
                        type={showGithubToken ? "text" : "password"}
                        placeholder="Token"
                        value={githubForm.token}
                        onChange={(event) =>
                          setGithubForm((prev) => ({ ...prev, token: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowGithubToken((prev) => !prev)}
                        className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
                      >
                        {showGithubToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setGithubForm({ id: 0, name: "", owner: "", repo: "", token: "", isDefault: false })
                      }
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleGithubSave} disabled={isBusy}>
                      {githubForm.id ? "Update config" : "Add config"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedUser && activeTab === "openai" && (
              <div className="flex gap-2">
                <div className="max-h-[640px] space-y-2 overflow-y-auto pr-2 w-1/2">
                  {openaiConfigs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{config.name}</span>
                          {config.isDefault && <Badge variant="success">Default</Badge>}
                        </div>
                        <span className="text-xs text-slate-400">
                          {AI_PROVIDERS.find((item) => item.id === config.provider)?.label || config.provider} - {config.model}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setOpenaiForm({
                              id: config.id,
                              name: config.name,
                              provider: config.provider || "openai",
                              apiKey: config.apiKey,
                              model: config.model,
                              baseUrl: config.baseUrl || "",
                              isDefault: config.isDefault,
                            })
                          }
                        >
                          <PenLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-300 hover:text-rose-200"
                          onClick={() => setConfirmDeleteOpenAiId(config.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {openaiConfigs.length === 0 && (
                    <p className="text-sm text-slate-400">No AI configs.</p>
                  )}
                </div>
                <div className="space-y-2 w-1/2">
                  <div className="flex flex-col gap-2">
                    <Input
                      placeholder="Profile name"
                      value={openaiForm.name}
                      onChange={(event) =>
                        setOpenaiForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                    />
                    <select
                      className="h-11 w-full rounded-xl border border-[#2a2f55] bg-[#0f1228] px-4 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
                      value={openaiForm.provider}
                      onChange={(event) => {
                        const nextProvider = event.target.value;
                        const nextModels = getProviderModels(nextProvider);
                        setOpenaiForm((prev) => ({
                          ...prev,
                          provider: nextProvider,
                          baseUrl: getProviderBaseUrl(nextProvider, "") || "",
                          model: nextModels[0]?.id || "",
                        }));
                      }}
                    >
                      {AI_PROVIDERS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-11 w-full rounded-xl border border-[#2a2f55] bg-[#0f1228] px-4 text-sm text-slate-100 outline-none transition focus:border-indigo-400"
                      value={selectedOpenAiModelValue}
                      onChange={(event) => {
                        const nextModel = event.target.value;
                        setOpenaiForm((prev) => ({
                          ...prev,
                          model: nextModel === "__custom" ? "" : nextModel,
                        }));
                      }}
                    >
                      {openAiProviderModels.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}{"thinking" in item && item.thinking ? " (thinking)" : ""}
                        </option>
                      ))}
                      <option value="__custom">Custom model ID</option>
                    </select>
                    {selectedOpenAiModelValue === "__custom" && (
                      <Input
                        placeholder="Custom model ID"
                        value={openaiForm.model}
                        onChange={(event) =>
                          setOpenaiForm((prev) => ({ ...prev, model: event.target.value }))
                        }
                      />
                    )}
                    <Input
                      placeholder="Base URL (optional)"
                      value={openaiForm.baseUrl}
                      onChange={(event) =>
                        setOpenaiForm((prev) => ({ ...prev, baseUrl: event.target.value }))
                      }
                    />
                    <div className="relative md:col-span-2">
                      <Input
                        type={showOpenAiKey ? "text" : "password"}
                        placeholder="API key"
                        value={openaiForm.apiKey}
                        onChange={(event) =>
                          setOpenaiForm((prev) => ({ ...prev, apiKey: event.target.value }))
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenAiKey((prev) => !prev)}
                        className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
                      >
                        {showOpenAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setOpenaiForm({ id: 0, name: "", provider: "openai", apiKey: "", model: "", baseUrl: "", isDefault: false })
                      }
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleOpenAiSave} disabled={isBusy}>
                      {openaiForm.id ? "Update config" : "Add config"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedUser && activeTab === "runs" && (
              <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between rounded-2xl border border-[#2a2f55] bg-[#0f1228] px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {run.jobDescription.slice(0, 50)}...
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(run.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={run.status === "ready" ? "success" : "warning"}>
                        {run.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewerText(run.jobDescription);
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
                        onClick={() => handleRunPreview(run)}
                        aria-label="Preview resume"
                        title="Preview resume"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {run.outputUrl && (
                        <a
                          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 bg-transparent text-neutral-200 hover:bg-violet-500/20 h-9 px-3 text-sm"
                          href={run.outputUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            push({
                              title: "Opening GitHub file...",
                              variant: "success",
                            })
                          }
                        >
                          <Github className="h-4 w-4" />
                        </a>
                      )}
                      {run.overleafUrl && (
                        <a
                          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 bg-transparent text-neutral-200 hover:bg-violet-500/20 h-9 px-3 text-sm"
                          href={run.overleafUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() =>
                            push({
                              title: "Opening Overleaf link...",
                              variant: "success",
                            })
                          }
                        >
                          <Leaf className="h-4 w-4" />
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-300 hover:text-rose-200"
                        onClick={() => setConfirmDeleteRunId(run.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {runs.length === 0 && (
                  <p className="text-sm text-slate-400">No runs found.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmDeleteUserId !== null}
        title="Delete this user?"
        description="This removes their templates, prompts, configs, and history."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteUserId(null)}
        onConfirm={() => {
          if (confirmDeleteUserId) {
            handleDeleteUser(confirmDeleteUserId);
          }
          setConfirmDeleteUserId(null);
        }}
      />
      <ConfirmDialog
        open={confirmDeleteConfigId !== null}
        title="Delete this GitHub config?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteConfigId(null)}
        onConfirm={async () => {
          if (confirmDeleteConfigId) {
            await deleteAdminGithubConfig(confirmDeleteConfigId);
            if (selectedUserId) {
              await loadUserData(selectedUserId);
            }
            push({ title: "GitHub config deleted.", variant: "success" });
          }
          setConfirmDeleteConfigId(null);
        }}
      />
      <ConfirmDialog
        open={confirmDeleteOpenAiId !== null}
        title="Delete this AI config?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteOpenAiId(null)}
        onConfirm={async () => {
          if (confirmDeleteOpenAiId) {
            await deleteAdminOpenAiConfig(confirmDeleteOpenAiId);
            if (selectedUserId) {
              await loadUserData(selectedUserId);
            }
            push({ title: "AI config deleted.", variant: "success" });
          }
          setConfirmDeleteOpenAiId(null);
        }}
      />
      <ConfirmDialog
        open={confirmDeleteRunId !== null}
        title="Delete this run?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteRunId(null)}
        onConfirm={async () => {
          if (confirmDeleteRunId) {
            await deleteAdminRun(confirmDeleteRunId);
            if (selectedUserId) {
              await loadUserData(selectedUserId);
            }
            push({ title: "Run deleted.", variant: "success" });
          }
          setConfirmDeleteRunId(null);
        }}
      />
      <ConfirmDialog
        open={confirmDeleteTemplateId !== null}
        title="Delete this template?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeleteTemplateId(null)}
        onConfirm={async () => {
          if (confirmDeleteTemplateId) {
            await deleteAdminTemplate(confirmDeleteTemplateId);
            if (selectedUserId) {
              await loadUserData(selectedUserId);
            }
            push({ title: "Template deleted.", variant: "success" });
          }
          setConfirmDeleteTemplateId(null);
        }}
      />
      <ConfirmDialog
        open={confirmDeletePromptId !== null}
        title="Delete this prompt?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmDeletePromptId(null)}
        onConfirm={async () => {
          if (confirmDeletePromptId) {
            await deleteAdminPrompt(confirmDeletePromptId);
            if (selectedUserId) {
              await loadUserData(selectedUserId);
            }
            push({ title: "Prompt deleted.", variant: "success" });
          }
          setConfirmDeletePromptId(null);
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
    </>
  );
}
