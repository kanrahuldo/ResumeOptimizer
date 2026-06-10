"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col items-center justify-center gap-4 rounded-[32px] border border-[#2a2f55] bg-[#0f1228]/90 p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Chat recovered from an error</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">
          The saved chat state for this browser tab was interrupted or corrupted.
        </p>
      </div>
      <Button
        onClick={() => {
          window.sessionStorage.removeItem("resume-optimizer-chat");
          reset();
        }}
      >
        Reset chat
      </Button>
    </div>
  );
}
