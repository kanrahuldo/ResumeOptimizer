import { runs } from "@/db/schema";

export const runResponseFields = {
  id: runs.id,
  userId: runs.userId,
  jobDescription: runs.jobDescription,
  templateId: runs.templateId,
  promptId: runs.promptId,
  outputUrl: runs.outputUrl,
  overleafUrl: runs.overleafUrl,
  status: runs.status,
  createdAt: runs.createdAt,
};
