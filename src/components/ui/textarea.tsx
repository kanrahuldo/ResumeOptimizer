import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[180px] w-full rounded-2xl border border-indigo-900/50 bg-[#111325] px-4 py-3 text-sm text-slate-100",
      "placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Textarea };
