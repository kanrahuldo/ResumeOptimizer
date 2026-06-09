"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  History,
  MessageCircle,
  Settings,
  Shield,
  UserCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="relative min-h-screen bg-[#0b0b14] text-neutral-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-[-10%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.22),_transparent_65%)]" />
        <div className="absolute right-[-20%] top-[30%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,_rgba(20,184,166,0.18),_transparent_70%)]" />
        <div className="absolute bottom-[-20%] left-[20%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,_rgba(16,185,129,0.18),_transparent_70%)]" />
      </div>
      <div className="relative flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200">
              <FileCodeCornerIcon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
                Resume Studio
              </span>
              <span className="text-lg font-semibold text-neutral-100">
                Resume Optimizer
              </span>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <IconNavButton href="/" label="Home" active={pathname === "/"}>
              <Home className="h-8 w-8" />
            </IconNavButton>
            <IconNavButton
              href="/app"
              label="Chat"
              active={pathname === "/app"}
            >
              <MessageCircle className="h-8 w-8" />
            </IconNavButton>
            <IconNavButton
              href="/history"
              label="History"
              active={pathname === "/history"}
            >
              <History className="h-8 w-8" />
            </IconNavButton>
            <IconNavButton
              href="/settings"
              label="Settings"
              active={pathname === "/settings"}
            >
              <Settings className="h-8 w-8" />
            </IconNavButton>
            {session?.user?.roleId === 2 ? (
              <IconNavButton
                href="/admin"
                label="Admin"
                active={pathname === "/admin"}
              >
                <Shield className="h-8 w-8" />
              </IconNavButton>
            ) : null}
            {session?.user?.id ? (
              <IconNavButton
                href="/account"
                label="Account"
                active={pathname === "/account"}
              >
                <UserCircle className="h-8 w-8" />
              </IconNavButton>
            ) : null}
          </nav>
        </header>
        <main className="flex-1 px-4 pb-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}

function IconNavButton({
  href,
  label,
  children,
  active = false,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-10 w-10 rounded-full p-0 transition",
          active
            ? "bg-violet-600/40 hover:bg-violet-600/50 text-white"
            : "text-slate-200"
        )}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        title={label}
      >
        {children}
      </Button>
    </Link>
  );
}

function FileCodeCornerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12.15V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2h-3.35" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="m5 16-3 3 3 3" />
      <path d="m9 22 3-3-3-3" />
    </svg>
  );
}
