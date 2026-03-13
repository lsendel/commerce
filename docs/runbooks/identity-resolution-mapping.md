# Identity Resolution Mapping

## Objective

Define deterministic account resolution for password and social sign-in while preventing ambiguous mappings.

## Resolution Order

1. Provider subject match
- For OAuth callbacks, resolve by provider subject first:
  - `google_sub`
  - `apple_sub`
  - `meta_sub`

2. Canonical email fallback
- If provider subject has no match, resolve by canonical email (`lower(trim(email))`).
- If multiple users match canonical email, reject sign-in and require manual support resolution.

3. New account creation
- If no provider subject or canonical email match exists, create a new user.

## Conflict Rules

1. Provider/email mismatch conflict
- If provider-sub resolves to one user but canonical email resolves to another user, reject sign-in.

2. Duplicate canonical email conflict
- Multiple users sharing same canonical email are treated as an identity conflict and must be remediated.

3. Provider-sub uniqueness conflict
- Duplicate provider-sub mappings are critical integrity errors and must fail identity health checks.

## Hardening Controls Implemented

- User email lookup is case-insensitive (`lower(email)` matching).
- User creation persists canonical lowercased email.
- OAuth resolution path enforces ambiguity and mismatch checks before linking identities.
- Identity health smoke scans for duplicate canonical emails and duplicate provider-sub mappings.

## Monitoring

- Command:
  - `pnpm smoke:identity-resolution`
- Artifact outputs:
  - `output/smoke/identity-resolution-report.json`
  - `output/smoke/identity-resolution-report.md`
- Matrix stage:
  - included in `pnpm smoke:e2e-matrix`
  - skip flag: `SMOKE_MATRIX_SKIP_IDENTITY_RESOLUTION=true`
