"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Generate" },
  { href: "/settings", label: "Settings" },
  { href: "/history", label: "History" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 flex-col gap-6 border-r border-neutral-800/80 bg-neutral-900/70 px-6 py-8 backdrop-blur lg:flex">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Resume Studio
        </span>
        <span className="text-xl font-semibold text-neutral-100">
          Resume Optimizer
        </span>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-amber-400 text-neutral-950 shadow-sm"
                  : "text-neutral-300 hover:bg-neutral-800"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs text-neutral-400">
          Local mode • Draft data only
        </div>
      </div>
    </aside>
  );
}
