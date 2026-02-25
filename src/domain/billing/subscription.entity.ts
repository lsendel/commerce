export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "trialing"
  | "unpaid"
  | "incomplete";

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createSubscription(
  params: Omit<
    Subscription,
    | "createdAt"
    | "updatedAt"
    | "cancelAtPeriodEnd"
    | "canceledAt"
    | "trialStart"
    | "trialEnd"
  > & {
    cancelAtPeriodEnd?: boolean;
    canceledAt?: Date | null;
    trialStart?: Date | null;
    trialEnd?: Date | null;
  }
): Subscription {
  const now = new Date();
  return {
    ...params,
    cancelAtPeriodEnd: params.cancelAtPeriodEnd ?? false,
    canceledAt: params.canceledAt ?? null,
    trialStart: params.trialStart ?? null,
    trialEnd: params.trialEnd ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
