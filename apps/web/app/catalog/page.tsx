"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { Button } from "../../components/ui/button";
import { apiRequest } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { modelCatalogUiEnabled } from "../../lib/features";
import type { ModelCatalogRecord } from "../../lib/types";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 border-emerald-200",
  RETIRING: "bg-amber-50 text-amber-800 border-amber-200",
  DEPRECATED: "bg-orange-50 text-orange-800 border-orange-200",
  RETIRED: "bg-slate-100 text-slate-600 border-slate-200"
};

export default function CatalogPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [entries, setEntries] = useState<ModelCatalogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    if (!modelCatalogUiEnabled) {
      router.replace("/dashboard");
      return;
    }
    const authToken = getToken();
    setToken(authToken);
    setReady(true);
    if (!authToken) {
      setLoading(false);
      return;
    }
    void loadCatalog(authToken);
  }, [router]);

  async function loadCatalog(authToken: string) {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<ModelCatalogRecord[]>("/model-catalog", { token: authToken });
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }

  const providers = useMemo(() => [...new Set(entries.map((entry) => entry.provider))].sort(), [entries]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (provider !== "all" && entry.provider !== provider) return false;
      if (status !== "all" && entry.status !== status) return false;
      return true;
    });
  }, [entries, provider, status]);

  return (
    <AppShell>
      <div className="space-y-6 p-5 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reference data</p>
            <h1 className="mt-1 text-2xl font-semibold">Model catalog</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Curated provider pricing and lifecycle metadata used for recommendations and migration readiness. Dev-only UI.
            </p>
          </div>
          <Button disabled={!token || loading} onClick={() => token && void loadCatalog(token)}>
            Refresh
          </Button>
        </div>

        {ready && !token ? (
          <div className="rounded-md border border-border bg-white p-4 text-sm">
            Sign in at <code className="rounded bg-muted px-1">/login</code> first. Your JWT is saved as{" "}
            <code className="rounded bg-muted px-1">sentinelai.accessToken</code> in browser localStorage.
          </div>
        ) : null}

        {error ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {token ? (
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Provider</span>
              <select
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                value={provider}
                onChange={(event) => setProvider(event.target.value)}
              >
                <option value="all">All providers</option>
                {providers.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted-foreground">Status</span>
              <select
                className="rounded-md border border-border bg-white px-3 py-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="RETIRING">Retiring</option>
                <option value="DEPRECATED">Deprecated</option>
                <option value="RETIRED">Retired</option>
              </select>
            </label>
            <div className="flex items-end text-sm text-muted-foreground">
              {loading ? "Loading…" : `${filtered.length} of ${entries.length} models`}
            </div>
          </div>
        ) : null}

        {token && !loading && filtered.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Model</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Input / 1M</th>
                    <th className="px-4 py-3">Output / 1M</th>
                    <th className="px-4 py-3">Context</th>
                    <th className="px-4 py-3">Capabilities</th>
                    <th className="px-4 py-3">Replacement</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-border/70 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{entry.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.provider}/{entry.model}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${statusStyles[entry.status] ?? "bg-muted text-foreground"}`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">${entry.inputTokenPricePer1M}</td>
                      <td className="px-4 py-3">${entry.outputTokenPricePer1M}</td>
                      <td className="px-4 py-3">{entry.contextWindow?.toLocaleString() ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.capabilities.join(", ")}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {entry.replacementModel
                          ? `${entry.replacementProvider}/${entry.replacementModel}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
