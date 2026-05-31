"use client";

import {
  CheckCircle2,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  Settings,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/verification", label: "Verification", icon: CheckCircle2 },
  { href: "/traces", label: "Traces", icon: FileSearch },
  { href: "/settings", label: "Settings", icon: Settings }
];

function NavLink({
  href,
  label,
  icon: Icon,
  active
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-white/10 text-white"
          : "text-white/60 hover:bg-white/[0.06] hover:text-white"
      )}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />
      ) : null}
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-accent")} />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col border-r border-white/10 bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-[4.25rem] items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-lift">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight">SentinelAI</div>
            <div className="text-[11px] text-white/50">Verified model switching</div>
          </div>
        </div>

        <p className="border-b border-white/10 px-5 py-4 text-xs leading-relaxed text-white/45">
          Shadow-test real prompts before you downgrade models in production.
        </p>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <NavLink key={item.href} {...item} active={active} />;
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/verification"
            className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
          >
            Run verification
          </Link>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 px-2 py-2 backdrop-blur-lg lg:hidden">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-semibold",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="lg:pl-[17.5rem]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85 backdrop-blur-md">
          <div className="flex h-14 items-center px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold">SentinelAI</span>
            </div>
            <p className="hidden text-sm text-muted-foreground lg:block">
              Can I safely switch models and save money?
            </p>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
