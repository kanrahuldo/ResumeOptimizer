import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-neutral-800/80 bg-neutral-900/70 px-6 py-4 backdrop-blur lg:hidden">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
          Resume Studio
        </span>
        <span className="text-lg font-semibold text-neutral-100">
          Resume Optimizer
        </span>
      </div>
      <Link href="/settings">
        <Button variant="secondary" size="sm">
          Settings
        </Button>
      </Link>
    </header>
  );
}
