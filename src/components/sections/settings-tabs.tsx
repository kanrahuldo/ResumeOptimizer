"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SettingsGithub } from "./settings-github";
import { SettingsOpenAI } from "./settings-openai";
import { SettingsPrompt } from "./settings-prompt";
import { SettingsTemplates } from "./settings-templates";

const tabs = ["Templates", "Prompt", "GitHub", "AI"] as const;
type TabKey = (typeof tabs)[number];

export function SettingsTabs() {
  const [active, setActive] = useState<TabKey>("Templates");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <section className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Configuration
          </p>
          <h1 className="text-3xl font-semibold text-slate-100">Settings</h1>
          <p className="max-w-2xl text-sm text-slate-300 md:text-base">
            Manage LaTeX templates, prompt profiles, and the GitHub/AI credentials.
          </p>
        </section>
        <div className="inline-flex flex-wrap gap-2 rounded-full border border-[#2a2f55] bg-[#0f1228]/80 p-2 lg:ml-auto">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={active === tab ? "primary" : "ghost"}
              size="sm"
              className={cn(active === tab ? "" : "text-slate-300")}
              onClick={() => setActive(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>
      {active === "Templates" && <SettingsTemplates />}
      {active === "Prompt" && <SettingsPrompt />}
      {active === "GitHub" && <SettingsGithub />}
      {active === "AI" && <SettingsOpenAI />}
    </div>
  );
}
