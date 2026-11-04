/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { resolveModerationResult } from "./moderationResult";

describe("moderation publication decisions", () => {
  test("a backend 403 rejection remains blocked", async () => {
    const response = new Response(JSON.stringify({ allowed: false, message: "התוכן נחסם" }), { status: 403 });
    const result = await resolveModerationResult(null, { context: response });
    expect(result.allowed).toBe(false);
    expect(result.processedContent).toBeUndefined();
  });

  test("a network failure does not permit publication", async () => {
    expect((await resolveModerationResult(null, new Error("offline"))).allowed).toBe(false);
  });

  test("an exception from an error response cannot permit publication", async () => {
    expect((await resolveModerationResult(null, { context: new Response("unavailable", { status: 500 }) })).allowed).toBe(false);
  });

  test("even an approval in a failed response cannot permit publication", async () => {
    const response = new Response(JSON.stringify({ allowed: true, processedContent: "text" }), { status: 500 });
    expect((await resolveModerationResult(null, { context: response })).allowed).toBe(false);
  });

  test("missing or malformed decisions do not permit publication", async () => {
    for (const value of [null, {}, { allowed: "true" }, { allowed: true }]) {
      expect((await resolveModerationResult(value, null)).allowed).toBe(false);
    }
  });

  test("a valid approval returns only the server-processed content", async () => {
    const result = await resolveModerationResult({ allowed: true, processedContent: "approved" }, null);
    expect(result.allowed).toBe(true);
    expect(result.processedContent).toBe("approved");
  });
});