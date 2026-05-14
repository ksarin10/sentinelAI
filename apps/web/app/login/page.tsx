"use client";

import { RadioTower, ShieldCheck } from "lucide-react";
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
    <main className="grid min-h-screen place-items-center bg-background p-5">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-border bg-white shadow-panel lg:grid-cols-[1.05fr_0.95fr]">
        <div className="bg-[#101820] p-8 text-white lg:p-10">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#d96b4a]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="mt-16">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#9ad7cf]">
              <RadioTower className="h-3.5 w-3.5" />
              SentinelAI
            </div>
            <h1 className="max-w-md text-4xl font-semibold leading-tight">A control room for model behavior.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/62">Capture every important LLM call, score it, and give product teams a durable trace ledger instead of scattered logs.</p>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3"><div className="text-white/42">Trace</div><div className="mt-1 font-semibold text-white">Prompts</div></div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3"><div className="text-white/42">Score</div><div className="mt-1 font-semibold text-white">Quality</div></div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3"><div className="text-white/42">Watch</div><div className="mt-1 font-semibold text-white">Spend</div></div>
          </div>
        </div>
        <div className="p-6 lg:p-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground lg:hidden">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{mode === "login" ? "Sign in" : "Create account"}</h2>
            <p className="text-sm text-muted-foreground">Access your observability workspace.</p>
          </div>
        </div>
        <div className="mb-5 grid grid-cols-2 rounded-md border border-border bg-muted p-1">
          <button className={`rounded px-3 py-2 text-sm ${mode === "login" ? "bg-white shadow-panel" : "text-muted-foreground"}`} onClick={() => setMode("login")} type="button">
            Sign in
          </button>
          <button className={`rounded px-3 py-2 text-sm ${mode === "register" ? "bg-white shadow-panel" : "text-muted-foreground"}`} onClick={() => setMode("register")} type="button">
            Register
          </button>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          {mode === "register" ? <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" /> : null}
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@company.com" required />
          <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" required minLength={8} />
          {error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        </div>
      </section>
    </main>
  );
}
