"use client";

import { Activity, ArrowRight, Binary, Radar } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandLogo } from "../../components/brand-logo";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { login, register } from "../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="sidebar-glow relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.07] p-10 text-sidebar-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(hsl(0_0%_100%/0.025)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_100%/0.025)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full border border-primary/10 shadow-[0_0_100px_hsl(81_88%_64%/0.06)]" />
        <div className="pointer-events-none absolute -right-10 top-[40%] h-52 w-52 rounded-full border border-dashed border-primary/20" />
        <div className="relative">
          <BrandLogo size="lg" showWordmark variant="dark" />
        </div>
        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-primary">
            <Radar className="h-3.5 w-3.5" />
            Production model intelligence
          </p>
          <h1 className="font-display mt-6 max-w-lg text-5xl leading-[1.02] tracking-[-0.05em]">
            Know what changes before your model does.
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/45">
            Replay real production prompts, inspect response-level evidence, and
            quantify the exact tradeoff between quality, latency, and spend.
          </p>
          <div className="mt-8 h-24 max-w-md overflow-hidden rounded-xl border border-white/[0.07] bg-black/20 p-4 font-mono text-[10px] text-white/35">
            <div className="flex items-center gap-2 text-primary">
              <span className="signal-dot" /> LIVE EVALUATION STREAM
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Binary className="h-3.5 w-3.5" /> support.answer · gpt-4.1 →
              gpt-4.1-mini
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Activity className="h-3.5 w-3.5" /> quality 0.91 · risk 0.04 ·
              −68% cost
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-3 gap-3 text-xs">
          {[
            { step: "01", label: "Ingest traces" },
            { step: "02", label: "Shadow replay" },
            { step: "03", label: "Switch safely" },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 backdrop-blur-sm transition hover:border-white/15"
            >
              <div className="font-mono text-[9px] font-medium text-primary">
                {item.step}
              </div>
              <div className="mt-1 font-semibold text-white">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandLogo size="md" />
            <div>
              <h2 className="text-lg font-bold">
                {mode === "login" ? "Sign in" : "Create account"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Verified model switching
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <p className="console-label">Secure workspace access</p>
            <h2 className="font-display mt-3 text-2xl tracking-[-0.03em]">
              {mode === "login"
                ? "Sign in to SentinelAI"
                : "Create your workspace"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Access your verification workspace.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/50 p-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "bg-white/[0.07] text-foreground shadow-panel"
                  : "text-muted-foreground"
              }`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                mode === "register"
                  ? "bg-white/[0.07] text-foreground shadow-panel"
                  : "text-muted-foreground"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "register" ? (
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
              />
            ) : null}
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@company.com"
              required
            />
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              required
              minLength={8}
            />
            {error ? (
              <div className="rounded-lg border border-red-400/20 bg-red-400/[0.07] px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            ) : null}
            <Button className="w-full" disabled={loading}>
              {loading
                ? "Working…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
