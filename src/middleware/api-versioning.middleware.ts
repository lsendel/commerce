import type { MiddlewareHandler } from "hono";
import type { Env } from "../env";
import {
  evaluateApiVersion,
  getLatestApiVersion,
  getSupportedApiVersions,
  resolveRequestedApiVersion,
} from "../shared/api-versioning";

function toSunsetHeaderValue(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00.000Z`).toUTCString();
}

function toAbsoluteUrl(appUrl: string, path: string): string {
  const normalizedBase = appUrl.replace(/\/$/, "");
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!path.startsWith("/")) return `${normalizedBase}/${path}`;
  return `${normalizedBase}${path}`;
}

export function apiVersioningMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const requestedVersion = resolveRequestedApiVersion(c.req.raw);
    const resolution = evaluateApiVersion(requestedVersion);

    if (requestedVersion && !resolution.supported) {
      return c.json(
        {
          error: "Unsupported API version requested.",
          requestedVersion,
          supportedVersions: getSupportedApiVersions(),
          latestVersion: getLatestApiVersion(),
          migrationGuidePath: "/docs/runbooks/api-versioning-migration.md",
          migrationHooksEndpoint: "/api/versioning/migration-hooks",
        },
        400,
      );
    }

    await next();

    c.header("X-API-Version", resolution.effectiveVersion);
    c.header("X-API-Latest-Version", getLatestApiVersion());
    c.header("X-API-Version-Defaulted", resolution.defaulted ? "true" : "false");
    if (resolution.requestedVersion) {
      c.header("X-API-Version-Requested", resolution.requestedVersion);
    }

    const migrationGuideUrl = toAbsoluteUrl(c.env.APP_URL, resolution.migrationGuidePath);
    c.header("X-API-Migration-Guide", migrationGuideUrl);

    if (resolution.isDeprecated) {
      c.header("Deprecation", "true");
      if (resolution.sunsetOn) {
        c.header("Sunset", toSunsetHeaderValue(resolution.sunsetOn));
      }
      c.header(
        "Link",
        `<${migrationGuideUrl}>; rel="deprecation"; type="text/markdown"`,
        { append: true },
      );
      if (resolution.deprecationNote) {
        c.header("Warning", `299 - "${resolution.deprecationNote}"`);
      }
    }
  };
}
