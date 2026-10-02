import type { GameInviteView } from "../../shared/types";

/** Pending invites stay visible until the waiting lobby's TTL has passed. */
export function isVisibleGameInvite(
  invite: Pick<GameInviteView, "status" | "expiresAt">,
  now = Date.now()
) {
  return invite.status === "pending" && now <= invite.expiresAt;
}
