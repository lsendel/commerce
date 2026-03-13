# Audit Trail + PII Guardrails Runbook

## Scope

- Middleware: `src/middleware/audit-trail.middleware.ts`
- Redaction utility: `src/shared/pii-redaction.ts`
- Integrity helper: `src/shared/audit-trail.ts`
- Validation gate: `pnpm smoke:audit-pii`
- Purpose:
  - enforce structured audit logging for all `/api/*` requests,
  - prevent sensitive values from entering logs,
  - maintain deterministic integrity hashes for audit entries.

## Audit Event Shape

- Each `/api/*` request emits a structured `level: "audit"` log event with:
  - `timestamp`, `requestId`, `method`, `path`, `status`, `durationMs`, `outcome`,
  - `actor` (`userId`, `role`, `sessionState`),
  - request metadata (`ip`, `userAgent`, `queryKeys`, selected header presence flags),
  - `integrityHash` (SHA-256 hex digest over canonical event payload + secret).

## PII Redaction Policy

- Keys with sensitive semantics are hard-redacted (`[REDACTED]`), including:
  - `password`, `token`, `authorization`, `cookie`, `secret`, `email`, `phone`, and related variants.
- Freeform strings are sanitized for:
  - bearer tokens,
  - JWT-like values,
  - email addresses,
  - phone-number-like values,
  - querystring secrets (`token=...`, `password=...`, etc.).
- Error-handler logs are emitted through `redactForLogs(...)` before `console.error(...)`.

## Smoke Gate

1. Run:
- `pnpm smoke:audit-pii`

2. Artifacts:
- `output/smoke/audit-pii-report.json`
- `output/smoke/audit-pii-report.md`

3. Pass criteria:
- audit middleware mounted on `/api/*`,
- non-zero API endpoint coverage discovery,
- full discovered endpoint/mutation coverage via global middleware,
- deterministic redaction checks pass,
- integrity hash shape check passes,
- error-handler redaction hook is present.

## Failure Handling

1. If coverage checks fail:
- ensure `app.use("/api/*", auditTrailMiddleware())` remains mounted in `src/index.tsx`,
- confirm route mounts are still discoverable from `app.route(...)` statements.
2. If redaction checks fail:
- update `src/shared/pii-redaction.ts` key patterns and string sanitizers,
- rerun `pnpm smoke:audit-pii`.
3. If integrity hash check fails:
- verify `buildAuditIntegrityHash` still outputs lowercase 64-char SHA-256 hex.
