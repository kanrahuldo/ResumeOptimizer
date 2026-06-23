import { NextResponse } from "next/server";

import { getUserId } from "@/lib/auth";
import {
  generateResumeRun,
  getGenerationErrorDetails,
  getGenerationErrorMessage,
  isGenerationOverload,
  isGenerationTimeout,
} from "@/lib/resume-generation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const jobDescription = String(body?.jobDescription || "").trim();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required." },
        { status: 400 }
      );
    }

    const result = await generateResumeRun({
      userId,
      jobDescription,
      request,
      templateId: body?.templateId ? Number(body.templateId) : null,
      promptId: body?.promptId ? Number(body.promptId) : null,
      aiConfigId: body?.aiConfigId ? Number(body.aiConfigId) : null,
      model: String(body?.model || "").trim() || undefined,
    });

    return NextResponse.json({
      data: {
        overleafUrl: result.overleafUrl,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Validation failed.") {
      return NextResponse.json(
        {
          error: "Validation failed.",
          details: getGenerationErrorDetails(error),
        },
        { status: 422 }
      );
    }

    if (
      error instanceof Error &&
      (error.message === "Selected template not found." ||
        error.message === "Selected prompt not found." ||
        error.message === "Selected AI profile not found.")
    ) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (
      error instanceof Error &&
      (error.message === "Template not configured." ||
        error.message === "Prompt profile not configured." ||
        error.message === "AI provider API key not configured.")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const isTimeout = isGenerationTimeout(error);
    const isOverload = isGenerationOverload(error);
    const details = getGenerationErrorDetails(error);

    return NextResponse.json(
      {
        error: isTimeout
          ? "The AI provider took too long to respond. Try a faster model or retry in a moment."
          : getGenerationErrorMessage(error),
        details: isTimeout || isOverload ? undefined : details,
      },
      { status: isTimeout ? 504 : isOverload ? 503 : 500 }
    );
  }
}
