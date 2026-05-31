"use client";

import { Database, KeyRound, Plus, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
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
      <div className="mx-auto max-w-4xl space-y-6 p-5 lg:p-8">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect OpenAI for verification replay, set quality thresholds, and manage ingestion keys.
          </p>
        </div>
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{notice}</div> : null}

        <Card className="p-5">
          <h2 className="text-base font-semibold">Project</h2>
          <form className="mt-4 flex flex-wrap gap-3" onSubmit={createProject}>
            <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="My AI product" required />
            <Button disabled={!token}>
              <Plus className="mr-2 h-4 w-4" />
              Create project
            </Button>
          </form>
          {projects.length > 0 ? (
            <select
              className="mt-4 h-10 rounded-md border border-border bg-white px-3 text-sm"
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
        </Card>

        {selectedProject ? (
          <>
            <Card className="p-5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold">OpenAI API key</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Required for shadow replay when verifying a cheaper OpenAI model. You pay replay cost directly to OpenAI.
              </p>
              <form className="mt-4 flex flex-wrap gap-3" onSubmit={saveOpenAiKey}>
                <Input
                  className="min-w-[280px] flex-1"
                  type="password"
                  value={providerApiKey}
                  onChange={(e) => setProviderApiKey(e.target.value)}
                  placeholder="sk-..."
                  minLength={8}
                  required
                />
                <Button type="submit">Save key</Button>
              </form>
              {providerCredentials.filter((c) => c.provider === "openai").map((c) => (
                <div key={c.provider} className="mt-3 text-sm text-muted-foreground">
                  Saved: {c.keyHint}
                </div>
              ))}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold">Evaluation threshold</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Verification passes when replayed responses meet this semantic quality floor.
              </p>
              <form className="mt-4 flex flex-wrap gap-3" onSubmit={saveTaskProfile}>
                <Input value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="support.answer" className="max-w-[200px]" />
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={taskQualityThreshold}
                  onChange={(e) => setTaskQualityThreshold(e.target.value)}
                  className="max-w-[120px]"
                />
                <Button type="submit">Save threshold</Button>
              </form>
              {taskProfiles.map((profile) => (
                <div key={profile.id} className="mt-3 text-sm text-muted-foreground">
                  {profile.taskName}: quality ≥ {profile.qualityThreshold}
                </div>
              ))}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold">Trace ingestion key</h2>
              <form className="mt-4 flex flex-wrap gap-3" onSubmit={createApiKey}>
                <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} className="max-w-xs" />
                <Button>Create ingestion key</Button>
              </form>
            </Card>

            <Card className="border-teal-200 bg-teal-50/60 p-5">
              <h2 className="text-base font-semibold">Demo data</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Load sample support.answer traffic on gpt-4.1, then run verification from Overview.
              </p>
              <Button className="mt-4 bg-white text-foreground ring-1 ring-teal-300" onClick={seedDemo} disabled={seedingDemo}>
                <Database className="mr-2 h-4 w-4" />
                {seedingDemo ? "Loading…" : "Load demo traffic"}
              </Button>
            </Card>
          </>
        ) : null}

        <Button className="bg-white text-foreground ring-1 ring-border" onClick={() => load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      </div>
    </AppShell>
  );
}
