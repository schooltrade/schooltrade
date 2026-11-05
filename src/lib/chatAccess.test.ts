/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { canUseMessaging, participantChats } from "./chatAccess";

describe("free messaging access", () => {
  test("a registered non-Club user can use messaging", () => {
    expect(canUseMessaging({ code: "test-account", isPremium: false })).toBe(true);
    expect(canUseMessaging(null)).toBe(false);
  });

  test("conversations are not capped at five", () => {
    const chats = Array.from({ length: 12 }, (_, id) => ({ id, user1_code: "test-account", user2_code: `peer-${id}` }));
    expect(participantChats(chats, "test-account")).toHaveLength(12);
  });

  test("existing history from earlier months remains available", () => {
    const chats = [
      { id: "old", user1_code: "test-account", user2_code: "peer", created_at: "2025-01-01" },
      { id: "unrelated", user1_code: "other", user2_code: "peer", created_at: "2025-01-01" },
    ];
    expect(participantChats(chats, "test-account").map(chat => chat.id)).toEqual(["old"]);
  });
});