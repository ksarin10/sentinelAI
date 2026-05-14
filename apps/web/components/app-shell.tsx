import { Activity, BarChart3, KeyRound, RadioTower, ShieldCheck } from "lucide-react";
import Link from "next/link";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/projects", label: "Projects", icon: KeyRound }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-[#101820] text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d96b4a] text-white shadow-panel">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">SentinelAI</div>
            <div className="text-xs text-white/55">Signal control plane</div>
          </div>
        </div>
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45">
            <RadioTower className="h-3.5 w-3.5" />
            Live ingest
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <div className="text-white/45">Queue</div>
              <div className="mt-1 font-semibold text-[#9ad7cf]">BullMQ</div>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <div className="text-white/45">Store</div>
              <div className="mt-1 font-semibold text-[#f1b08f]">Postgres</div>
            </div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/68 transition hover:bg-white/10 hover:text-white">
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 p-5 text-xs text-white/45">
          <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="font-medium text-white/75">Observability mode</div>
            <div className="mt-1">Trace, evaluate, compare, repeat.</div>
          </div>
        </div>
      </aside>
      <main className="lg:pl-72">
        <header className="flex h-16 items-center justify-between border-b border-border bg-white/72 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2 text-sm font-medium lg:hidden">
            <Activity className="h-5 w-5 text-primary" />
            SentinelAI
          </div>
          <div className="hidden text-sm font-medium text-muted-foreground lg:block">Model behavior, spend, and quality in one operational view</div>
          <div className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-panel">Demo workspace</div>
        </header>
        {children}
      </main>
    </div>
  );
}
