export interface ModerationResult {
  allowed: boolean;
  processedContent?: string;
  message?: string;
}

const unavailable = (): ModerationResult => ({
  allowed: false,
  message: "לא ניתן לבדוק את התוכן כרגע. התוכן לא נשלח; נסה שוב בעוד רגע.",
});

function readResult(value: unknown): ModerationResult | undefined {
  if (!value || typeof value !== "object" || !("allowed" in value)) return;
  if (typeof value.allowed !== "boolean") return;
  const message = "message" in value && typeof value.message === "string"
    ? value.message
    : undefined;
  if (!value.allowed) return { allowed: false, message: message || "התוכן מכיל שפה פוגענית ולא ניתן לשלוח אותו." };
  if (!("processedContent" in value) || typeof value.processedContent !== "string") return;
  return { allowed: true, processedContent: value.processedContent, message };
}

/** A non-success response must never become permission to publish. */
export async function resolveModerationResult(
  data: unknown,
  error: unknown,
): Promise<ModerationResult> {
  if (error) {
    if (typeof error === "object" && "context" in error && error.context instanceof Response) {
      try {
        const result = readResult(await error.context.clone().json());
        if (result && !result.allowed) return result;
      } catch {
        // An unreadable error body is an unavailable check, not an approval.
      }
    }
    return unavailable();
  }
  return readResult(data) ?? unavailable();
}