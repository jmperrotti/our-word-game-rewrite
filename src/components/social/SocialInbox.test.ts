import { describe, expect, it } from "vitest";
import { isVisibleGameInvite } from "../../lib/gameInvites";
import { resolveInviteJoinDisplayName } from "./SocialInbox";

describe("resolveInviteJoinDisplayName", () => {
  it("prefers the saved game display name when accepting an invite", () => {
    expect(resolveInviteJoinDisplayName("  ArenaNick  ", "AccountName")).toBe("ArenaNick");
  });

  it("falls back to the signed-in account username when the saved name is empty", () => {
    expect(resolveInviteJoinDisplayName("   ", "AccountName")).toBe("AccountName");
  });
});

describe("isVisibleGameInvite", () => {
  it("hides an invite once its lobby expiry has passed", () => {
    const expiresAt = 1_000;
    expect(isVisibleGameInvite({ status: "pending", expiresAt }, expiresAt)).toBe(true);
    expect(isVisibleGameInvite({ status: "pending", expiresAt }, expiresAt + 1)).toBe(false);
    expect(isVisibleGameInvite({ status: "expired", expiresAt }, expiresAt - 1)).toBe(false);
  });
});
