export type Membership = {
  status: string;
  access_until: string | null;
  stripe_customer_id?: string | null;
};
export function hasPaidAccess(
  membership: Membership | null | undefined,
  now = Date.now(),
): boolean {
  return (
    !!membership &&
    membership.status === "active" &&
    !!membership.access_until &&
    Number.isFinite(Date.parse(membership.access_until)) &&
    Date.parse(membership.access_until) > now
  );
}
export function trustedOrigin(origin: string | null, appUrl: string): boolean {
  try {
    return !!origin && new URL(origin).origin === new URL(appUrl).origin;
  } catch {
    return false;
  }
}
export function mayApplyEvent(
  current: {
    subscription_created: number;
    event_created: number;
    status: string;
  } | null,
  incoming: {
    subscription_created: number;
    event_created: number;
    status: string;
  },
): boolean {
  return (
    !current ||
    incoming.subscription_created > current.subscription_created ||
    (incoming.subscription_created === current.subscription_created &&
      (incoming.event_created > current.event_created ||
        (incoming.event_created === current.event_created &&
          incoming.status === "inactive")))
  );
}
