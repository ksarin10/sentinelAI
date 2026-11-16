"use client";

import {
  Activity,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  PlayCircle,
  Search,
  Settings,
  TerminalSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand-logo";
import { cn } from "../lib/utils";

const nav = [
  { href: "/dashboard", label: "Control room", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/verification", label: "Verification", icon: CheckCircle2 },
  { href: "/traces", label: "Live traces", icon: FileSearch },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  active,
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
        "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150",
        active
          ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.055)]"
          : "text-white/45 hover:bg-white/[0.035] hover:text-white/80",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          active ? "text-primary" : "text-white/35 group-hover:text-white/70",
        )}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={1.8} />
      </span>
      {label}
      {active ? (
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-white/30" />
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-[4.5rem] lg:pb-0">
      <aside className="sidebar-glow fixed inset-y-0 left-0 z-30 hidden w-[15.5rem] flex-col border-r border-white/[0.065] text-sidebar-foreground lg:flex">
        <div className="relative flex h-[4.25rem] items-center border-b border-white/[0.06] px-4">
          <BrandLogo size="md" showWordmark variant="dark" />
        </div>

        <div className="mx-3 mt-3 rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
          <div className="flex items-center gap-2">
            <span className="signal-dot" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
              System healthy
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/30">
            <span>Ingestion online</span>
            <Activity className="h-3.5 w-3.5 text-primary/70" />
          </div>
        </div>

        <p className="px-4 pb-2 pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/25">
          Workspace
        </p>
        <nav className="flex-1 space-y-0.5 px-2.5">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <NavLink key={item.href} {...item} active={active} />;
          })}
        </nav>

        <div className="border-t border-white/[0.06] p-3">
          <Link
            href="/verification"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-gradient px-4 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 active:scale-[0.99]"
          >
            <PlayCircle className="h-4 w-4" />
            Run verification
          </Link>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border/80 bg-card/90 px-1 py-1.5 backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="lg:pl-[15.5rem]">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur-2xl">
          <div className="flex h-[3.5rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5 lg:hidden">
              <BrandLogo size="sm" />
              <span className="text-sm font-bold tracking-tight">
                SentinelAI
              </span>
            </div>
            <div className="hidden items-center gap-3 lg:flex">
              <TerminalSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-[11px] text-muted-foreground">
                sentinel / production
              </span>
            </div>
            <div
              className="hidden h-8 min-w-[15rem] items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-left text-xs text-muted-foreground lg:flex"
              aria-label="Search shortcut preview"
            >
              <Search className="h-3.5 w-3.5" />
              Search traces, tasks, models…
              <span className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px]">
                ⌘K
              </span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
