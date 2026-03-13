export const ANALYTICS_EVENT_ALIASES = {
  begin_checkout: "checkout_started",
  checkout_begin: "checkout_started",
  order_completed: "purchase",
  purchase_completed: "purchase",
} as const;

export const ANALYTICS_EVENT_TAXONOMY_VERSION = "week-46-v1";

export const ANALYTICS_EVENT_TAXONOMY = {
  coreJourney: [
    "page_view",
    "product_view",
    "collection_view",
    "search",
    "add_to_cart",
    "remove_from_cart",
    "bundle_add_to_cart",
    "checkout_started",
    "checkout_preflight_warning",
    "checkout_preflight_blocked",
    "delivery_promise_checkout_window",
    "purchase",
    "reorder_to_cart",
    "checkout_recovery_landing",
    "notify_restock",
  ],
  identity: [
    "signup",
    "login",
  ],
  growthExperiments: [
    "pricing_experiment_proposal_generated",
    "pricing_experiment_started",
    "pricing_experiment_stopped",
  ],
  automation: [
    "checkout_recovery_enqueued",
    "checkout_recovery_sent",
    "checkout_recovery_skipped",
    "checkout_recovery_delivery_failed",
    "workflow_builder_workflow_created",
    "workflow_builder_workflow_updated",
    "workflow_builder_workflow_toggled",
    "workflow_builder_preview_requested",
    "workflow_builder_run_executed",
    "workflow_builder_workflow_deleted",
    "birthday_offer_sent",
  ],
  support: [
    "support_deflection_requested",
    "support_deflection_resolved",
    "support_deflection_escalation_recommended",
    "support_deflection_feedback",
  ],
  platformOps: [
    "incident_responder_triage_requested",
    "incident_responder_triage_generated",
    "incident_responder_triage_acknowledged",
    "fulfillment_exception_scan_requested",
    "fulfillment_exception_auto_resolve_executed",
    "fulfillment_sla_prediction_generated",
    "fulfillment_sla_intervention_executed",
    "queue_dlq_candidate_recorded",
    "queue_dlq_auto_remediation_executed",
    "queue_dlq_auto_remediation_skipped",
    "queue_dlq_auto_remediation_failed",
    "queue_dlq_manual_review_required",
    "integration_marketplace_app_installed",
    "integration_marketplace_app_uninstalled",
    "integration_marketplace_app_verified",
    "integration_marketplace_app_verification_failed",
    "integration_partner_onboarding_completed",
    "integration_partner_contract_verified",
    "integration_partner_contract_verification_failed",
    "headless_api_pack_created",
    "headless_api_pack_revoked",
    "store_template_created",
    "store_template_clone_created",
    "store_template_deleted",
    "studio_pipeline_draft_generated",
    "studio_pipeline_product_created",
  ],
  domainSpecific: [
    "workshop",
  ],
} as const;

const ANALYTICS_EVENT_TYPE_PATTERN = /^[a-z0-9]+(?:[._][a-z0-9]+)*$/;

export const ANALYTICS_FUNNEL_STEPS = [
  "page_view",
  "product_view",
  "add_to_cart",
  "checkout_started",
  "order_completed",
] as const;

export const ANALYTICS_EVENT_TYPES_BY_FUNNEL_STEP: Record<
  (typeof ANALYTICS_FUNNEL_STEPS)[number],
  string[]
> = {
  page_view: ["page_view"],
  product_view: ["product_view"],
  add_to_cart: ["add_to_cart"],
  checkout_started: ["checkout_started", "begin_checkout"],
  order_completed: ["purchase", "order_completed"],
};

const KNOWN_ANALYTICS_EVENT_TYPES = new Set<string>(
  Object.values(ANALYTICS_EVENT_TAXONOMY).flatMap((items) => [...items]),
);

export type AnalyticsEventCategory = keyof typeof ANALYTICS_EVENT_TAXONOMY | "unknown";

export function getKnownAnalyticsEventTypes(): string[] {
  return [...KNOWN_ANALYTICS_EVENT_TYPES].sort();
}

export function isValidAnalyticsEventTypeFormat(eventType: string): boolean {
  return ANALYTICS_EVENT_TYPE_PATTERN.test(eventType);
}

export function isKnownAnalyticsEventType(eventType: string): boolean {
  return KNOWN_ANALYTICS_EVENT_TYPES.has(eventType);
}

export function classifyAnalyticsEventType(eventType: string): AnalyticsEventCategory {
  for (const [category, events] of Object.entries(ANALYTICS_EVENT_TAXONOMY)) {
    if ((events as readonly string[]).includes(eventType)) {
      return category as AnalyticsEventCategory;
    }
  }
  return "unknown";
}

export function normalizeAnalyticsEventType(eventType: string): string {
  const key = eventType.trim().toLowerCase();
  if (!key) return "unknown";
  return ANALYTICS_EVENT_ALIASES[
    key as keyof typeof ANALYTICS_EVENT_ALIASES
  ] ?? key;
}

export function resolveAnalyticsEventType(eventType: string): {
  accepted: boolean;
  eventType: string;
  reason: string | null;
  category: AnalyticsEventCategory;
} {
  const normalized = normalizeAnalyticsEventType(eventType);
  if (!normalized || normalized === "unknown") {
    return {
      accepted: false,
      eventType: "unknown",
      reason: "Event type is missing after normalization.",
      category: "unknown",
    };
  }

  if (!isValidAnalyticsEventTypeFormat(normalized)) {
    return {
      accepted: false,
      eventType: normalized,
      reason: "Event type format is invalid. Use lowercase snake_case or dotted notation.",
      category: "unknown",
    };
  }

  if (!isKnownAnalyticsEventType(normalized)) {
    return {
      accepted: false,
      eventType: normalized,
      reason: "Event type is not in analytics taxonomy.",
      category: "unknown",
    };
  }

  return {
    accepted: true,
    eventType: normalized,
    reason: null,
    category: classifyAnalyticsEventType(normalized),
  };
}
