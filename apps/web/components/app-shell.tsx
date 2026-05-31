"use client";

import {
  CheckCircle2,
  ClipboardList,
  FileSearch,
  LayoutDashboard,
  PlayCircle,
  Settings
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./brand-logo";
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
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "text-white/55 hover:bg-white/[0.07] hover:text-white"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          active ? "bg-primary/25 text-teal-300" : "bg-white/5 text-white/70 group-hover:bg-white/10"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      {label}
      {active ? (
        <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_hsl(14_88%_56%/0.8)]" aria-hidden />
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-[4.5rem] lg:pb-0">
      <aside className="sidebar-glow fixed inset-y-0 left-0 z-30 hidden w-[18rem] flex-col border-r border-white/[0.08] text-sidebar-foreground lg:flex">
        <div className="relative border-b border-white/10 px-5 py-5">
          <div className="pointer-events-none absolute -right-8 -top-12 h-32 w-32 rounded-full bg-teal-500/20 blur-3xl" />
          <BrandLogo size="md" showWordmark variant="dark" />
        </div>

        <p className="px-5 py-4 text-xs leading-relaxed text-white/40">
          Replay production prompts against cheaper models — with evidence, not guesswork.
        </p>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <NavLink key={item.href} {...item} active={active} />;
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/verification"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            <PlayCircle className="h-4 w-4" />
            Run verification
          </Link>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/90 px-1 py-1.5 backdrop-blur-xl lg:hidden">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="lg:pl-[18rem]">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="flex h-[3.25rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2.5 lg:hidden">
              <BrandLogo size="sm" />
              <span className="text-sm font-bold tracking-tight">SentinelAI</span>
            </div>
            <p className="hidden text-sm font-medium text-muted-foreground lg:block">
              Can I safely switch models and save money?
            </p>
            <div className="hidden h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(168_65%_40%/0.6)] lg:block" aria-hidden />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
