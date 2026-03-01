type IncidentSeverity = "sev1" | "sev2" | "sev3";

type IncidentSignalType =
  | "checkout_conversion_drop"
  | "fulfillment_failure_spike"
  | "payment_failure_spike"
  | "provider_outage"
  | "queue_backlog"
  | "p1_open_over_60m"
  | "unknown";

type IncidentType =
  | "checkout_degradation"
  | "fulfillment_failure_spike"
  | "payment_failure_spike"
  | "provider_outage"
  | "queue_backlog"
  | "p1_incident_stale"
  | "unknown";

type ResponseTeam = "growth" | "operations" | "platform";

interface IncidentAction {
  title: string;
  detail: string;
  priority: "immediate" | "next" | "follow_up";
  command?: string;
}

interface IncidentRunbook {
  id: string;
  title: string;
  url: string;
  rollbackCommand: string;
}

interface IncidentProfile {
  type: IncidentType;
  team: ResponseTeam;
  defaultSeverity: IncidentSeverity;
  patterns: RegExp[];
  runbook: IncidentRunbook;
  actions: IncidentAction[];
}

interface IncidentEventSignal {
  eventType: string;
  count: number;
}

interface IncidentResponderInput {
  summary: string;
  signalType?: IncidentSignalType;
  severity?: IncidentSeverity;
  recentSignals?: IncidentEventSignal[];
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export interface IncidentResponderResult {
  incidentType: IncidentType;
  severity: IncidentSeverity;
  confidence: number;
  triageSummary: string;
  suspectedRootCause: string;
  responseTeam: ResponseTeam;
  runbook: IncidentRunbook;
  recommendedActions: IncidentAction[];
  escalation: {
    pageOnCall: boolean;
    reason: string;
  };
  warnings: string[];
}

const SIGNAL_TO_INCIDENT: Record<IncidentSignalType, IncidentType> = {
  checkout_conversion_drop: "checkout_degradation",
  fulfillment_failure_spike: "fulfillment_failure_spike",
  payment_failure_spike: "payment_failure_spike",
  provider_outage: "provider_outage",
  queue_backlog: "queue_backlog",
  p1_open_over_60m: "p1_incident_stale",
  unknown: "unknown",
};

const INCIDENT_PROFILES: IncidentProfile[] = [
  {
    type: "checkout_degradation",
    team: "growth",
    defaultSeverity: "sev2",
    patterns: [/checkout/i, /conversion/i, /payment step/i],
    runbook: {
      id: "runbook-checkout-degradation",
      title: "Checkout Conversion Degradation",
      url: "/admin/analytics",
      rollbackCommand: "Disable checkout_recovery and cart_goal_progress flags",
    },
    actions: [
      {
        title: "Validate checkout availability",
        detail: "Run a guest and logged-in checkout smoke to isolate failing step.",
        priority: "immediate",
      },
      {
        title: "Inspect conversion funnel deltas",
        detail: "Compare checkout_started and purchase rates versus prior 7-day baseline.",
        priority: "next",
      },
      {
        title: "Rollback recent checkout-facing flag",
        detail: "Disable the most recent checkout experiment if degradation exceeds threshold.",
        priority: "next",
        command: "Set FEATURE_FLAGS without checkout experiment keys and redeploy",
      },
    ],
  },
  {
    type: "fulfillment_failure_spike",
    team: "operations",
    defaultSeverity: "sev2",
    patterns: [/fulfillment/i, /shipment/i, /failed jobs?/i],
    runbook: {
      id: "runbook-fulfillment-failure",
      title: "Fulfillment Failure Spike",
      url: "/admin/fulfillment",
      rollbackCommand: "Disable split_shipment_optimizer and carrier_fallback_routing flags",
    },
    actions: [
      {
        title: "Identify failing provider and status",
        detail: "Filter failed requests by provider and error signature in fulfillment dashboard.",
        priority: "immediate",
      },
      {
        title: "Re-route new requests",
        detail: "Switch traffic to healthy providers and pause retries for the failing one.",
        priority: "next",
      },
      {
        title: "Requeue safe failed requests",
        detail: "Retry requests with transient errors after provider health stabilizes.",
        priority: "follow_up",
      },
    ],
  },
  {
    type: "payment_failure_spike",
    team: "platform",
    defaultSeverity: "sev1",
    patterns: [/payment/i, /card declines?/i, /stripe/i],
    runbook: {
      id: "runbook-payment-failures",
      title: "Payment Failures Spike",
      url: "/admin/analytics",
      rollbackCommand: "Disable promotion and checkout experiments that changed payment payloads",
    },
    actions: [
      {
        title: "Verify payment provider status",
        detail: "Check provider health and webhook delivery for payment confirmations.",
        priority: "immediate",
      },
      {
        title: "Sample failed transactions",
        detail: "Classify failures by auth, validation, and provider timeout categories.",
        priority: "next",
      },
      {
        title: "Escalate to platform on-call",
        detail: "Open incident channel with failing request IDs and timeline.",
        priority: "next",
      },
    ],
  },
  {
    type: "provider_outage",
    team: "operations",
    defaultSeverity: "sev1",
    patterns: [/provider outage/i, /printful/i, /gooten/i, /prodigi/i, /shapeways/i],
    runbook: {
      id: "runbook-provider-outage",
      title: "External Provider Outage",
      url: "/admin/fulfillment",
      rollbackCommand: "Force fallback provider routing and disable direct provider dependency",
    },
    actions: [
      {
        title: "Isolate outage blast radius",
        detail: "List impacted SKUs and pending request count for affected provider.",
        priority: "immediate",
      },
      {
        title: "Activate fallback routing",
        detail: "Shift new jobs to backup provider where catalog mapping exists.",
        priority: "next",
      },
      {
        title: "Publish merchant comms",
        detail: "Notify internal stakeholders of ETA impact and mitigation path.",
        priority: "follow_up",
      },
    ],
  },
  {
    type: "queue_backlog",
    team: "platform",
    defaultSeverity: "sev2",
    patterns: [/queue/i, /backlog/i, /consumer lag/i],
    runbook: {
      id: "runbook-queue-backlog",
      title: "Queue Backlog and Consumer Lag",
      url: "/admin/analytics",
      rollbackCommand: "Pause non-critical producers and increase consumer concurrency",
    },
    actions: [
      {
        title: "Measure queue depth trend",
        detail: "Confirm whether backlog is growing or draining over 15-minute windows.",
        priority: "immediate",
      },
      {
        title: "Protect critical queues",
        detail: "Temporarily pause non-critical background jobs to prioritize orders.",
        priority: "next",
      },
      {
        title: "Inspect consumer errors",
        detail: "Collect top exception signatures and roll back recent worker changes.",
        priority: "next",
      },
    ],
  },
  {
    type: "p1_incident_stale",
    team: "platform",
    defaultSeverity: "sev1",
    patterns: [/p1/i, /over 60/i, /incident/i],
    runbook: {
      id: "runbook-p1-stale",
      title: "P1 Incident Open Over 60 Minutes",
      url: "/admin/analytics",
      rollbackCommand: "Rollback latest risky release and freeze rollout at 10%",
    },
    actions: [
      {
        title: "Assign clear incident owner",
        detail: "Confirm one DRI and explicit next update time in incident channel.",
        priority: "immediate",
      },
      {
        title: "Apply fastest safe rollback",
        detail: "Revert latest risky changes to restore baseline service behavior.",
        priority: "next",
      },
      {
        title: "Escalate leadership visibility",
        detail: "Share impact, current mitigation, and ETA every 15 minutes.",
        priority: "follow_up",
      },
    ],
  },
];

const FALLBACK_PROFILE: IncidentProfile = {
  type: "unknown",
  team: "platform",
  defaultSeverity: "sev2",
  patterns: [],
  runbook: {
    id: "runbook-generic-triage",
    title: "Generic Incident Triage",
    url: "/admin/analytics",
    rollbackCommand: "Disable newest feature flags and restore last known good config",
  },
  actions: [
    {
      title: "Collect primary impact",
      detail: "Capture affected journey, error signatures, and customer impact scope.",
      priority: "immediate",
    },
    {
      title: "Correlate with recent changes",
      detail: "Compare incident start time against deploys, flags, and provider incidents.",
      priority: "next",
    },
    {
      title: "Stabilize first, optimize later",
      detail: "Rollback risky changes and keep a written timeline of decisions.",
      priority: "follow_up",
    },
  ],
};

export class AiIncidentResponderUseCase {
  private readonly endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  constructor(private readonly apiKey: string) {}

  async execute(input: IncidentResponderInput): Promise<IncidentResponderResult> {
    const warnings: string[] = [];
    const summary = input.summary.trim();
    const detection = this.detectIncident(summary, input.signalType, input.recentSignals ?? []);
    const profile = this.profileForType(detection.type);
    const severity = input.severity ?? profile.defaultSeverity;

    const detectedSignals = (input.recentSignals ?? [])
      .filter((signal) => signal.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((signal) => `${signal.eventType}:${signal.count}`)
      .join(", ");

    const defaultSummary = [
      `Detected incident category: ${profile.type.replaceAll("_", " ")}.`,
      `Primary response team: ${profile.team}.`,
      detectedSignals ? `Observed signals: ${detectedSignals}.` : "No strong event spikes detected.",
      `Recommended immediate action: ${profile.actions.find((action) => action.priority === "immediate")?.title ?? "start triage"}.`,
    ].join(" ");

    let triageSummary = defaultSummary;
    if (!this.apiKey.trim()) {
      warnings.push("GEMINI_API_KEY is not configured; deterministic triage summary was used.");
    } else {
      const aiSummary = await this.generateTriageSummary(summary, profile, severity, defaultSummary).catch(
        () => null,
      );
      if (aiSummary) {
        triageSummary = aiSummary;
      } else {
        warnings.push("AI summary unavailable; deterministic triage summary was used.");
      }
    }

    return {
      incidentType: profile.type,
      severity,
      confidence: detection.confidence,
      triageSummary,
      suspectedRootCause: this.buildRootCauseHint(profile.type, summary),
      responseTeam: profile.team,
      runbook: profile.runbook,
      recommendedActions: profile.actions,
      escalation: {
        pageOnCall: severity === "sev1" || profile.type === "p1_incident_stale",
        reason:
          severity === "sev1" || profile.type === "p1_incident_stale"
            ? "Severity indicates immediate on-call attention."
            : "Can proceed with team triage unless impact broadens.",
      },
      warnings,
    };
  }

  private detectIncident(
    summary: string,
    signalType: IncidentSignalType | undefined,
    recentSignals: IncidentEventSignal[],
  ): { type: IncidentType; confidence: number } {
    if (signalType && signalType !== "unknown") {
      return {
        type: SIGNAL_TO_INCIDENT[signalType],
        confidence: 0.92,
      };
    }

    for (const profile of INCIDENT_PROFILES) {
      if (profile.patterns.some((pattern) => pattern.test(summary))) {
        return {
          type: profile.type,
          confidence: 0.78,
        };
      }
    }

    if (recentSignals.some((signal) => signal.eventType.includes("incident_p1_open_over_60m") && signal.count > 0)) {
      return { type: "p1_incident_stale", confidence: 0.74 };
    }
    if (recentSignals.some((signal) => signal.eventType.includes("fulfillment") && signal.count > 10)) {
      return { type: "fulfillment_failure_spike", confidence: 0.69 };
    }
    if (recentSignals.some((signal) => signal.eventType.includes("checkout") && signal.count > 10)) {
      return { type: "checkout_degradation", confidence: 0.66 };
    }

    return { type: "unknown", confidence: 0.42 };
  }

  private profileForType(type: IncidentType): IncidentProfile {
    return INCIDENT_PROFILES.find((profile) => profile.type === type) ?? FALLBACK_PROFILE;
  }

  private buildRootCauseHint(type: IncidentType, summary: string): string {
    if (type === "provider_outage") {
      return "Likely external provider instability or API failure in the fulfillment path.";
    }
    if (type === "checkout_degradation") {
      return "Possible checkout UI/API regression or payment-provider latency causing drop-off.";
    }
    if (type === "fulfillment_failure_spike") {
      return "Likely routing, mapping, or provider-side submission failures for shipment jobs.";
    }
    if (type === "queue_backlog") {
      return "Consumer throughput may be below incoming event rate due to worker errors or capacity limits.";
    }
    if (type === "payment_failure_spike") {
      return "Payment authorization/confirmation path appears unstable or misconfigured.";
    }
    if (type === "p1_incident_stale") {
      return "Incident ownership or mitigation pace is insufficient for current severity and impact.";
    }

    const trimmed = summary.trim();
    if (trimmed.length > 0) {
      return `Root cause needs refinement. Start from reported symptom: ${trimmed.slice(0, 220)}.`;
    }
    return "Insufficient signal context. Capture impact scope and recent change timeline first.";
  }

  private async generateTriageSummary(
    summary: string,
    profile: IncidentProfile,
    severity: IncidentSeverity,
    defaultSummary: string,
  ): Promise<string | null> {
    const prompt = [
      "You are an incident triage copilot for an ecommerce operations team.",
      "Rewrite the triage summary to be concise and execution-focused.",
      "Do not invent metrics, systems, or policies.",
      "Use plain text only, max 90 words.",
      "",
      `Incident summary: ${summary}`,
      `Detected type: ${profile.type}`,
      `Severity: ${severity}`,
      `Primary team: ${profile.team}`,
      `Runbook: ${profile.runbook.title}`,
      `Fallback summary: ${defaultSummary}`,
    ].join("\n");

    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 220,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    return text.slice(0, 700);
  }
}

export function listIncidentRunbooks(): IncidentRunbook[] {
  return [...INCIDENT_PROFILES.map((profile) => profile.runbook), FALLBACK_PROFILE.runbook];
}
