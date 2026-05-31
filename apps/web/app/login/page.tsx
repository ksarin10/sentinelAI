"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
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
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(168_50%_40%/0.25),transparent_55%)]" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold">SentinelAI</span>
        </div>
        <div className="relative max-w-md">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Verified switching
          </p>
          <h1 className="font-display mt-6 text-4xl leading-tight tracking-tight">
            Know before you downgrade.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Replay production prompts against a cheaper model, score quality on each response, and get a clear switch
            recommendation with estimated savings.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-3 text-xs">
          {[
            { step: "01", label: "Ingest traces" },
            { step: "02", label: "Shadow replay" },
            { step: "03", label: "Switch safely" }
          ].map((item) => (
            <div key={item.step} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <div className="font-mono text-[10px] text-accent">{item.step}</div>
              <div className="mt-1 font-semibold text-white">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{mode === "login" ? "Sign in" : "Create account"}</h2>
              <p className="text-sm text-muted-foreground">Verified model switching</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <h2 className="font-display text-2xl tracking-tight">{mode === "login" ? "Sign in" : "Create account"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Access your verification workspace.</p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted p-1">
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-card text-foreground shadow-panel" : "text-muted-foreground"
              }`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                mode === "register" ? "bg-card text-foreground shadow-panel" : "text-muted-foreground"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {mode === "register" ? (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
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
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}
            <Button className="w-full" disabled={loading}>
              {loading ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
