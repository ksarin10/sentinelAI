"use client";

import { Copy, Database, KeyRound, Plus, RefreshCw, Send, Waypoints } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { apiRequest } from "../../lib/api";
import { getSelectedProjectId, getToken, saveSelectedProjectId } from "../../lib/auth";
import type { ApiKeyRecord, ProjectRecord, ProviderCredentialRecord } from "../../lib/types";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keyName, setKeyName] = useState("Server ingestion key");
  const [providerCredentials, setProviderCredentials] = useState<ProviderCredentialRecord[]>([]);
  const [providerName, setProviderName] = useState("openai");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];

  async function loadProviderCredentials(projectId: string, authToken: string) {
    const data = await apiRequest<ProviderCredentialRecord[]>(`/projects/${projectId}/provider-credentials`, {
      token: authToken
    });
    setProviderCredentials(data);
  }

  async function loadProjects(authToken: string | null = token) {
    if (!authToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await apiRequest<ProjectRecord[]>("/projects", { token: authToken });
      setProjects(data);
      const saved = getSelectedProjectId();
      const nextProjectId = data.find((project) => project.id === saved)?.id ?? data[0]?.id ?? "";
      setSelectedProjectId(nextProjectId);
      if (nextProjectId) {
        saveSelectedProjectId(nextProjectId);
        await loadProviderCredentials(nextProjectId, authToken);
      } else {
        setProviderCredentials([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const authToken = getToken();
    setToken(authToken);
    setReady(true);
    void loadProjects(authToken);
  }, []);

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("Please sign in first.");
      return;
    }
    const slug = slugify(name);
    setError("");
    setNotice("");
    try {
      const project = await apiRequest<ProjectRecord>("/projects", {
        token,
        method: "POST",
        body: { name, slug, description: description || undefined }
      });
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
      saveSelectedProjectId(project.id);
      setName("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    }
  }

  async function saveProviderCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedProject) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await apiRequest<ProviderCredentialRecord>(`/projects/${selectedProject.id}/provider-credentials`, {
        token,
        method: "POST",
        body: { provider: providerName, apiKey: providerApiKey }
      });
      setProviderApiKey("");
      await loadProviderCredentials(selectedProject.id, token);
      setNotice(`Saved ${providerName} provider key for shadow replay and cross-provider recommendations.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save provider key");
    }
  }

  async function createApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedProject) {
      return;
    }
    setError("");
    setNewSecret("");
    setNotice("");
    try {
      const key = await apiRequest<ApiKeyRecord>(`/projects/${selectedProject.id}/api-keys`, {
        token,
        method: "POST",
        body: { name: keyName }
      });
      setNewSecret(key.secret ?? "");
      await loadProjects(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create API key");
    }
  }

  async function seedDemoAnalytics() {
    if (!token || !selectedProject) {
      return;
    }
    setError("");
    setNotice("");
    setSeedingDemo(true);
    try {
      const result = await apiRequest<{ tracesCreated: number }>(`/projects/${selectedProject.id}/seed-demo-analytics`, {
        token,
        method: "POST"
      });
      setNotice(`Loaded ${result.tracesCreated} mock traces for recommendations and migration demos. Open the dashboard to review them.`);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load demo analytics");
    } finally {
      setSeedingDemo(false);
    }
  }

  async function createDemoTrace() {
    if (!token || !selectedProject) {
      return;
    }
    setError("");
    setNotice("");
    setCreatingDemo(true);
    try {
      await apiRequest(`/projects/${selectedProject.id}/demo-trace`, {
        token,
        method: "POST"
      });
      setNotice("Demo trace created and evaluation queued. Open the dashboard to see it.");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create demo trace");
    } finally {
      setCreatingDemo(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6 p-5 lg:p-8">
        <div className="rounded-lg border border-border bg-white p-5 shadow-panel lg:p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Waypoints className="h-3.5 w-3.5" />
                Ingest routing
              </div>
              <h1 className="text-3xl font-semibold">Projects and API Keys</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create isolated signal streams for products, environments, and teams.</p>
          </div>
          <Button className="bg-white text-foreground ring-1 ring-border" onClick={() => loadProjects()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
        </div>
        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {notice ? <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-800">{notice}</div> : null}
        {ready && !token ? <div className="rounded-md border border-border bg-white p-4 text-sm">Sign in first at `/login` to manage projects.</div> : null}
        <Card className="p-5">
          <h2 className="text-base font-semibold">Create project</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={createProject}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer Support Bot" required />
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Production support assistant" />
            <Button disabled={!token}>
              <Plus className="mr-2 h-4 w-4" />
              Create
            </Button>
          </form>
        </Card>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-border p-4">
              <h2 className="text-base font-semibold">Projects</h2>
            </div>
            {loading ? <div className="p-4 text-sm text-muted-foreground">Loading projects...</div> : null}
            {!loading && projects.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No projects yet. Create one to start ingesting traces.</div> : null}
            {projects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setSelectedProjectId(project.id);
                  saveSelectedProjectId(project.id);
                  if (token) {
                    void loadProviderCredentials(project.id, token);
                  }
                }}
                className={`block w-full border-t border-border px-4 py-3 text-left text-sm ${project.id === selectedProject?.id ? "bg-muted" : "bg-white hover:bg-muted"}`}
              >
                <div className="font-medium">{project.name}</div>
                <div className="text-xs text-muted-foreground">{project.slug}</div>
              </button>
            ))}
          </Card>
          <Card className="p-5">
            {selectedProject ? (
              <>
                <div className="flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-base font-semibold">{selectedProject.name}</h2>
                    <p className="text-sm text-muted-foreground">{selectedProject.apiKeys?.length ?? 0} API keys</p>
                  </div>
                </div>
                <form className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={createApiKey}>
                  <Input value={keyName} onChange={(event) => setKeyName(event.target.value)} placeholder="Server ingestion key" required />
                  <Button>Create key</Button>
                </form>
                <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold">LLM provider keys (for recommendations)</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Cross-provider suggestions and shadow replay use keys you store here. Same-provider downgrades need the baseline provider; add other providers to unlock cheaper models elsewhere.
                  </p>
                  <form className="mt-3 grid gap-3 md:grid-cols-[140px_1fr_auto]" onSubmit={saveProviderCredential}>
                    <select
                      className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                      value={providerName}
                      onChange={(event) => setProviderName(event.target.value)}
                    >
                      <option value="openai">openai</option>
                      <option value="anthropic">anthropic</option>
                      <option value="google">google</option>
                      <option value="groq">groq</option>
                      <option value="mistral">mistral</option>
                      <option value="cohere">cohere</option>
                    </select>
                    <Input
                      value={providerApiKey}
                      onChange={(event) => setProviderApiKey(event.target.value)}
                      type="password"
                      placeholder="sk-..."
                      required
                      minLength={8}
                    />
                    <Button type="submit" disabled={!providerApiKey}>
                      Save key
                    </Button>
                  </form>
                  <div className="mt-3 space-y-2">
                    {providerCredentials.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No provider keys saved yet.</div>
                    ) : null}
                    {providerCredentials.map((credential) => (
                      <div key={credential.provider} className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-sm">
                        <span className="font-medium">{credential.provider}</span>
                        <span className="text-muted-foreground">{credential.keyHint}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-border bg-muted p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <div className="text-sm font-medium">Create a sample trace</div>
                        <div className="text-sm text-muted-foreground">Writes one live trace and queues evaluation scoring.</div>
                      </div>
                      <Button type="button" onClick={createDemoTrace} disabled={creatingDemo}>
                        <Send className="mr-2 h-4 w-4" />
                        {creatingDemo ? "Sending..." : "Send test trace"}
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-md border border-teal-200 bg-teal-50/70 p-4">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <div className="text-sm font-medium">Load demo analytics</div>
                        <div className="text-sm text-muted-foreground">Seeds mock catalog, cost recommendations, and migration readiness data for dashboard testing.</div>
                      </div>
                      <Button type="button" className="bg-white text-foreground ring-1 ring-teal-300" onClick={seedDemoAnalytics} disabled={seedingDemo}>
                        <Database className="mr-2 h-4 w-4" />
                        {seedingDemo ? "Loading..." : "Load demo data"}
                      </Button>
                    </div>
                  </div>
                </div>
                {newSecret ? (
                  <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    New key, shown once:
                    <code className="mt-2 block overflow-x-auto rounded bg-white p-2 text-xs">{newSecret}</code>
                  </div>
                ) : null}
                <div className="mt-5 rounded-md border border-border">
                  {(selectedProject.apiKeys ?? []).length === 0 ? <div className="p-4 text-sm text-muted-foreground">No API keys yet.</div> : null}
                  {(selectedProject.apiKeys ?? []).map((key) => (
                    <div key={key.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-border p-4 text-sm first:border-t-0">
                      <span className="font-medium">{key.name}</span>
                      <span className="text-muted-foreground">{key.keyPrefix}...</span>
                      <button className="rounded-md p-2 hover:bg-muted" type="button" aria-label="Copy key prefix" onClick={() => navigator.clipboard.writeText(key.keyPrefix)}>
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Select or create a project to manage API keys.</div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
