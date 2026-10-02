import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { isVisibleGameInvite } from "../../lib/gameInvites";
import { usePollingQuery } from "../../lib/usePollingQuery";

type SocialOverviewResponse = Awaited<ReturnType<typeof api.getSocialOverview>>;

export interface SocialDataValue {
  data: SocialOverviewResponse | undefined;
  error: Error | null;
  loading: boolean;
  /**
   * Trigger an immediate refetch of the shared social overview without tearing
   * down the polling loop. Call this after a mutation so every consuming panel
   * reflects the change at once.
   */
  refresh: () => void;
}

const SocialDataContext = createContext<SocialDataValue | null>(null);

/**
 * Hoists a single `getSocialOverview` poll shared by every social panel
 * (Friends, Inbox, Guest Invites). Previously each panel polled the endpoint
 * independently, so mounting two or three of them together fetched `/api/social`
 * 2-3x per interval. This provider polls once and fans the result out through
 * context; mutations call `refresh()` to update all consumers at once.
 */
export function SocialDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Any signed-in user (anonymous guests included) needs the overview: guests
  // consume it via GuestInvitesPanel, full accounts via Friends + Inbox.
  const enabled = Boolean(user);

  const socialQuery = usePollingQuery(() => api.getSocialOverview(), [], {
    intervalMs: 5000,
    enabled,
  });
  const { data, error, loading, refetch } = socialQuery;
  const [now, setNow] = useState(() => Date.now());

  // Drop an invite the moment its lobby TTL passes, instead of leaving it on
  // screen until the next social poll happens to notice.
  useEffect(() => {
    const invites = [
      ...(data?.social.incomingGameInvites ?? []),
      ...(data?.social.outgoingGameInvites ?? []),
    ];
    const nextExpiry = invites.reduce<number | null>((soonest, invite) => {
      if (!Number.isFinite(invite.expiresAt)) {
        return soonest;
      }
      return soonest === null || invite.expiresAt < soonest ? invite.expiresAt : soonest;
    }, null);
    if (nextExpiry === null) {
      return;
    }

    const delay = Math.max(0, nextExpiry - Date.now() + 1);
    const timer = window.setTimeout(() => {
      setNow(Date.now());
      refetch();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [data, refetch]);

  const visibleData = useMemo(() => {
    if (!data) {
      return data;
    }

    return {
      ...data,
      social: {
        ...data.social,
        incomingGameInvites: data.social.incomingGameInvites.filter((invite) => isVisibleGameInvite(invite, now)),
        outgoingGameInvites: data.social.outgoingGameInvites.filter((invite) => isVisibleGameInvite(invite, now)),
      },
    };
  }, [data, now]);

  const value = useMemo<SocialDataValue>(
    () => ({ data: visibleData, error, loading, refresh: refetch }),
    [visibleData, error, loading, refetch]
  );

  return <SocialDataContext.Provider value={value}>{children}</SocialDataContext.Provider>;
}

export function useSocialData(): SocialDataValue {
  const context = useContext(SocialDataContext);
  if (!context) {
    throw new Error("useSocialData must be used within a SocialDataProvider.");
  }
  return context;
}
