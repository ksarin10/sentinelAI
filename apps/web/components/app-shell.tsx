"use client";

import { CheckCircle2, ClipboardList, FileSearch, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/verification", label: "Verification", icon: CheckCircle2 },
  { href: "/traces", label: "Traces", icon: FileSearch },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f4f1ec]">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-[#101820] text-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#d96b4a] text-white shadow-panel">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide">SentinelAI</div>
            <div className="text-xs text-white/55">Verified model switching</div>
          </div>
        </div>
        <div className="border-b border-white/10 px-6 py-5 text-xs text-white/55">
          Before you switch models in production, replay real prompts against a cheaper candidate and check whether quality
          holds.
        </div>
        <nav className="space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${
                  active ? "bg-white/12 text-white" : "text-white/68 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="lg:pl-72">
        <header className="flex h-16 items-center justify-between border-b border-border bg-white/80 px-5 backdrop-blur lg:px-8">
          <div className="text-sm font-medium text-foreground lg:hidden">SentinelAI</div>
          <div className="hidden text-sm text-muted-foreground lg:block">Can I safely switch models and save money?</div>
        </header>
        {children}
      </main>
    </div>
  );
}
