"use client";

import { Database, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { AlertBanner } from "../../components/alert-banner";
import { PageHeader } from "../../components/page-header";
import { Panel } from "../../components/panel";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { apiRequest } from "../../lib/api";
import { getSelectedProjectId, getToken, saveSelectedProjectId } from "../../lib/auth";
import type { ApiKeyRecord, ProjectRecord, ProviderCredentialRecord, TaskProfileRecord } from "../../lib/types";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function SettingsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [name, setName] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerCredentials, setProviderCredentials] = useState<ProviderCredentialRecord[]>([]);
  const [taskProfiles, setTaskProfiles] = useState<TaskProfileRecord[]>([]);
  const [taskName, setTaskName] = useState("support.answer");
  const [taskQualityThreshold, setTaskQualityThreshold] = useState("0.8");
  const [keyName, setKeyName] = useState("Server ingestion key");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  async function load(authToken: string | null = token) {
    if (!authToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<ProjectRecord[]>("/projects", { token: authToken });
      setProjects(data);
      const saved = getSelectedProjectId();
      const nextId = data.find((project) => project.id === saved)?.id ?? data[0]?.id ?? "";
      setSelectedProjectId(nextId);
      if (nextId) {
        saveSelectedProjectId(nextId);
        const [credentials, profiles] = await Promise.all([
          apiRequest<ProviderCredentialRecord[]>(`/projects/${nextId}/provider-credentials`, { token: authToken }),
          apiRequest<TaskProfileRecord[]>(`/projects/${nextId}/task-profiles`, { token: authToken })
        ]);
        setProviderCredentials(credentials);
        setTaskProfiles(profiles);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const authToken = getToken();
    setToken(authToken);
    void load(authToken);
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    await apiRequest<ProjectRecord>("/projects", {
      token,
      method: "POST",
      body: { name, slug: slugify(name), description: "SentinelAI workspace" }
    });
    setName("");
    await load(token);
  }

  async function saveOpenAiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedProject) return;
    await apiRequest(`/projects/${selectedProject.id}/provider-credentials`, {
      token,
      method: "POST",
      body: { provider: "openai", apiKey: providerApiKey }
    });
    setProviderApiKey("");
    setNotice("OpenAI key saved for shadow replay verification.");
    await load(token);
  }

  async function saveTaskProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedProject) return;
    await apiRequest(`/projects/${selectedProject.id}/task-profiles`, {
      token,
      method: "POST",
      body: {
        taskName,
        riskLevel: "MEDIUM",
        qualityThreshold: Number(taskQualityThreshold),
        optimizationGoal: "REDUCE_COST"
      }
    });
    setNotice(`Saved verification threshold for ${taskName}.`);
    await load(token);
  }

  async function seedDemo() {
    if (!token || !selectedProject) return;
    setSeedingDemo(true);
    try {
      const result = await apiRequest<{ tracesCreated: number }>(`/projects/${selectedProject.id}/seed-demo-analytics`, {
        token,
        method: "POST"
      });
      setNotice(`Loaded ${result.tracesCreated} demo traces. Open Overview and run verification.`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load demo data");
    } finally {
      setSeedingDemo(false);
    }
  }

  async function createApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedProject) return;
    await apiRequest<ApiKeyRecord>(`/projects/${selectedProject.id}/api-keys`, {
      token,
      method: "POST",
      body: { name: keyName }
    });
    setNotice("Ingestion API key created.");
    await load(token);
  }

  return (
    <AppShell>
      <div className="page-container mx-auto max-w-3xl space-y-8">
        <PageHeader
          eyebrow="Settings"
          title="Workspace setup"
          description="OpenAI key for live replay, quality thresholds per task, and ingestion keys for your app."
        />

        {error ? <AlertBanner variant="error">{error}</AlertBanner> : null}
        {notice ? <AlertBanner variant="success">{notice}</AlertBanner> : null}

        <Panel title="Project">
          <form className="flex flex-wrap gap-3" onSubmit={createProject}>
            <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="My AI product" required />
            <Button disabled={!token} size="sm">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </form>
          {projects.length > 0 ? (
            <select
              className="mt-4 h-10 w-full max-w-md appearance-none rounded-xl border border-border bg-card px-3.5 text-sm font-medium shadow-panel outline-none focus:ring-2 focus:ring-primary/15"
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                saveSelectedProjectId(e.target.value);
                void load(token);
              }}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          ) : null}
        </Panel>

        {selectedProject ? (
          <>
            <Panel
              title="OpenAI API key"
              description="Required for live shadow replay (SHADOW_REPLAY_MODE=api). You pay replay cost directly to OpenAI."
            >
              <form className="flex flex-wrap gap-3" onSubmit={saveOpenAiKey}>
                <Input
                  className="min-w-[240px] flex-1"
                  type="password"
                  value={providerApiKey}
                  onChange={(e) => setProviderApiKey(e.target.value)}
                  placeholder="sk-..."
                  minLength={8}
                  required
                />
                <Button type="submit" size="sm">
                  Save key
                </Button>
              </form>
              {providerCredentials
                .filter((c) => c.provider === "openai")
                .map((c) => (
                  <p key={c.provider} className="mt-3 text-sm text-muted-foreground">
                    Saved: {c.keyHint}
                  </p>
                ))}
            </Panel>

            <Panel title="Quality threshold" description="Replays pass when semantic score meets this floor.">
              <form className="flex flex-wrap gap-3" onSubmit={saveTaskProfile}>
                <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="support.answer" className="max-w-[200px]" />
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={taskQualityThreshold}
                  onChange={(e) => setTaskQualityThreshold(e.target.value)}
                  className="max-w-[100px]"
                />
                <Button type="submit" size="sm">
                  Save
                </Button>
              </form>
              {taskProfiles.map((profile) => (
                <p key={profile.id} className="mt-3 text-sm text-muted-foreground">
                  {profile.taskName}: quality ≥ {profile.qualityThreshold}
                </p>
              ))}
            </Panel>

            <Panel title="Ingestion API key">
              <form className="flex flex-wrap gap-3" onSubmit={createApiKey}>
                <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} className="max-w-xs flex-1" />
                <Button size="sm">Create key</Button>
              </form>
            </Panel>

            <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-card p-6 shadow-panel">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">Demo walkthrough</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Loads SupportBot Demo: 14 support.answer traces on gpt-4.1, then verify gpt-4.1-mini in simulate mode.
              </p>
              <Button className="mt-4" variant="secondary" onClick={seedDemo} disabled={seedingDemo}>
                {seedingDemo ? "Loading…" : "Load demo traffic"}
              </Button>
            </div>
          </>
        ) : null}

        <Button variant="secondary" size="sm" onClick={() => load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      </div>
    </AppShell>
  );
}
