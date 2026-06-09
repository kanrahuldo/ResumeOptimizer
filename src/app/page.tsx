import Link from "next/link";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isAuthed = Boolean(session?.user);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-5xl flex-col justify-center gap-12 px-4 md:px-10">
      <section className="space-y-6">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
          Resume Optimizer
        </p>
        <h1 className="text-4xl font-semibold text-slate-100 md:text-5xl">
          Craft tailored LaTeX resumes that actually match the job.
        </h1>
        <p className="max-w-2xl text-base text-slate-300">
          {isAuthed
            ? "You’re signed in. Pick a template, paste a job description, and get an Overleaf-ready resume link in seconds."
            : "Paste a job description, pick a template and prompt profile, and get an Overleaf-ready resume link in seconds. Keep your style, upgrade your relevance."}
        </p>
        <div className="flex flex-wrap gap-3">
          {isAuthed ? (
            <>
              <Link
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-medium text-white shadow-sm hover:translate-y-[-1px]"
                href="/app"
              >
                Open workspace
              </Link>
              <Link
                className="rounded-full border border-[#2a2f55] px-6 py-3 text-sm font-medium text-slate-200 hover:bg-white/5"
                href="/settings"
              >
                Manage settings
              </Link>
            </>
          ) : (
            <>
              <Link
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-medium text-white shadow-sm hover:translate-y-[-1px]"
                href="/auth/sign-in"
              >
                Sign in to start
              </Link>
              <Link
                className="rounded-full border border-[#2a2f55] px-6 py-3 text-sm font-medium text-slate-200 hover:bg-white/5"
                href="/auth/sign-up"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "1. Drop the job description",
            description:
              "Paste the role you want and let the system map skills, projects, and achievements.",
          },
          {
            title: "2. Pick your template",
            description:
              "Use multiple LaTeX templates and prompt profiles for different industries.",
          },
          {
            title: "3. Get the Overleaf link",
            description:
              "Review the output instantly and edit in Overleaf without breaking structure.",
          },
        ].map((step) => (
          <div
            key={step.title}
            className="rounded-3xl border border-[#2a2f55] bg-[#111325]/80 p-6"
          >
            <h3 className="text-lg font-semibold text-slate-100">
              {step.title}
            </h3>
            <p className="mt-2 text-sm text-slate-400">{step.description}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
