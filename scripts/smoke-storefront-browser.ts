import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "playwright";

const AUTH_COOKIE_NAME = "petm8_auth";

type SmokeStatus = "passed" | "failed" | "skipped";

interface StepResult {
  id: string;
  label: string;
  status: SmokeStatus;
  durationMs: number;
  detail: string;
}

interface SmokeReport {
  startedAt: string;
  finishedAt: string;
  status: SmokeStatus;
  baseUrl: string | null;
  authenticatedEmail: string | null;
  screenshotPath: string | null;
  steps: StepResult[];
  consoleErrors: string[];
  requestFailures: string[];
}

function isEnabled(value: string | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function normalizeBaseUrl(raw: string) {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function writeReport(report: SmokeReport) {
  const jsonPath =
    process.env.SMOKE_STOREFRONT_BROWSER_JSON_PATH ??
    "output/smoke/storefront-browser-report.json";
  const mdPath =
    process.env.SMOKE_STOREFRONT_BROWSER_MD_PATH ??
    "output/smoke/storefront-browser-report.md";

  await mkdir(dirname(jsonPath), { recursive: true });
  await mkdir(dirname(mdPath), { recursive: true });

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    "# Storefront Browser Smoke Report",
    "",
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Status: ${report.status}`,
    `- Base URL: ${report.baseUrl ?? "(not set)"}`,
    `- Authenticated Email: ${report.authenticatedEmail ?? "(none)"}`,
    `- Screenshot: ${report.screenshotPath ?? "(none)"}`,
    "",
    "## Steps",
    "",
    "| Step | Status | Duration(ms) | Detail |",
    "| --- | --- | --- | --- |",
    ...report.steps.map(
      (step) =>
        `| ${step.label} | ${step.status} | ${step.durationMs} | ${step.detail.replace(/\|/g, "\\|")} |`,
    ),
    "",
    "## Console Errors",
    "",
    ...(report.consoleErrors.length > 0 ? report.consoleErrors.map((line) => `- ${line}`) : ["- None"]),
    "",
    "## Request Failures",
    "",
    ...(report.requestFailures.length > 0 ? report.requestFailures.map((line) => `- ${line}`) : ["- None"]),
    "",
  ];

  await writeFile(mdPath, `${lines.join("\n")}\n`);
}

function buildSkippedReport(detail: string): SmokeReport {
  const timestamp = new Date().toISOString();
  return {
    startedAt: timestamp,
    finishedAt: timestamp,
    status: "skipped",
    baseUrl: process.env.SMOKE_BASE_URL?.trim() || null,
    authenticatedEmail: null,
    screenshotPath: null,
    steps: [
      {
        id: "preflight",
        label: "Preflight",
        status: "skipped",
        durationMs: 0,
        detail,
      },
    ],
    consoleErrors: [],
    requestFailures: [],
  };
}

function extractCookieValue(setCookieHeader: string | undefined, name: string) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match?.[1] ?? null;
}

async function ensureAuthCookie(args: {
  baseUrl: string;
  context: import("playwright").BrowserContext;
  response: import("playwright").APIResponse;
}) {
  const { baseUrl, context, response } = args;
  const existingCookies = await context.cookies(baseUrl);
  if (existingCookies.some((cookie) => cookie.name === AUTH_COOKIE_NAME)) {
    return;
  }

  const token = extractCookieValue(response.headers()["set-cookie"], AUTH_COOKIE_NAME);
  if (!token) {
    throw new Error("Authentication succeeded but auth cookie was not persisted.");
  }

  const url = new URL(baseUrl);
  await context.addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: token,
      domain: url.hostname,
      path: "/",
      httpOnly: true,
      secure: url.protocol === "https:",
      sameSite: "Lax",
    },
  ]);
}

async function authenticate(args: {
  baseUrl: string;
  context: import("playwright").BrowserContext;
}) {
  const { baseUrl, context } = args;
  const request = context.request;
  const explicitEmail = process.env.SMOKE_USER_EMAIL?.trim() || null;
  const explicitPassword = process.env.SMOKE_USER_PASSWORD?.trim() || null;
  const password = explicitPassword || "SmokePass123";

  const login = async (email: string) => {
    const response = await request.post(`${baseUrl}/api/auth/login`, {
      data: {
        email,
        password,
      },
      failOnStatusCode: false,
    });

    if (response.status() !== 200) {
      const body = await response.text();
      throw new Error(`Login failed with status ${response.status()}: ${body || "no response body"}`);
    }

    await ensureAuthCookie({ baseUrl, context, response });
    return {
      email,
      flow: "login" as const,
    };
  };

  const register = async (email: string) => {
    const response = await request.post(`${baseUrl}/api/auth/register`, {
      data: {
        name: "Storefront Smoke",
        email,
        password,
      },
      failOnStatusCode: false,
    });

    if (response.status() === 201) {
      await ensureAuthCookie({ baseUrl, context, response });
      return {
        email,
        flow: "register" as const,
      };
    }

    if (response.status() === 409) {
      return login(email);
    }

    const body = await response.text();
    throw new Error(
      `Register failed with status ${response.status()}: ${body || "no response body"}`,
    );
  };

  if (explicitEmail) {
    if (!explicitPassword) {
      throw new Error("SMOKE_USER_PASSWORD must be set when SMOKE_USER_EMAIL is provided.");
    }

    try {
      return await login(explicitEmail);
    } catch {
      return register(explicitEmail);
    }
  }

  const generatedEmail = `storefront-smoke+${Date.now()}@example.test`;
  return register(generatedEmail);
}

async function runStep<T>(
  steps: StepResult[],
  id: string,
  label: string,
  fn: () => Promise<T>,
) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    steps.push({
      id,
      label,
      status: "passed",
      durationMs: Date.now() - startedAt,
      detail: typeof result === "string" ? result : "OK",
    });
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    steps.push({
      id,
      label,
      status: "failed",
      durationMs: Date.now() - startedAt,
      detail,
    });
    throw error;
  }
}

async function main() {
  const explicitBaseUrl = process.env.SMOKE_BASE_URL?.trim();
  if (!explicitBaseUrl) {
    const report = buildSkippedReport(
      "Skipped: set SMOKE_BASE_URL explicitly to run browser smoke.",
    );
    await writeReport(report);
    console.log("Storefront browser smoke skipped: set SMOKE_BASE_URL explicitly.");
    return;
  }

  if (!isEnabled(process.env.SMOKE_ENABLE_MUTATIONS)) {
    const report = buildSkippedReport(
      "Skipped: browser smoke creates auth/cart/checkout state; set SMOKE_ENABLE_MUTATIONS=true to run it.",
    );
    await writeReport(report);
    console.log("Storefront browser smoke skipped: SMOKE_ENABLE_MUTATIONS is not enabled.");
    return;
  }

  const baseUrl = normalizeBaseUrl(explicitBaseUrl);
  const startedAt = new Date().toISOString();
  const steps: StepResult[] = [];
  const consoleErrors: string[] = [];
  const requestFailures: string[] = [];
  const screenshotPath =
    process.env.SMOKE_STOREFRONT_BROWSER_SCREENSHOT_PATH ??
    "output/smoke/storefront-browser-cart.png";
  let authenticatedEmail: string | null = null;

  const browser = await chromium.launch({
    headless: !isEnabled(process.env.SMOKE_BROWSER_HEADED),
  });
  const context = await browser.newContext({
    baseURL: baseUrl,
    viewport: { width: 1440, height: 1100 },
    ignoreHTTPSErrors: true,
  });
  context.setDefaultTimeout(
    Number(process.env.SMOKE_BROWSER_TIMEOUT_MS ?? 45_000),
  );

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("requestfailed", (request) => {
    requestFailures.push(
      `${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown failure"})`,
    );
  });

  try {
    await runStep(steps, "auth", "Authenticate Smoke User", async () => {
      const result = await authenticate({ baseUrl, context });
      authenticatedEmail = result.email;
      return `Authenticated via ${result.flow} as ${result.email}`;
    });

    await runStep(steps, "account-orders", "Open Account Orders", async () => {
      await page.goto(`${baseUrl}/account/orders`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("h1");
      const heading = (await page.locator("h1").first().textContent())?.trim() ?? "";
      if (!heading.toLowerCase().includes("orders")) {
        throw new Error(`Unexpected account orders heading: ${heading || "(empty)"}`);
      }
      return "Account orders page loaded for authenticated user.";
    });

    await runStep(steps, "home", "Load Homepage", async () => {
      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("main");
      const heading = (await page.locator("h1").first().textContent())?.trim() ?? "";
      if (!heading) {
        throw new Error("Homepage did not render a visible hero heading.");
      }
      return `Homepage loaded with hero heading "${heading}".`;
    });

    const physicalProduct = await runStep(
      steps,
      "product-catalog",
      "Find Physical Product",
      async () => {
        const response = await context.request.get(
          `${baseUrl}/api/products?page=1&limit=20&type=physical`,
          { failOnStatusCode: false },
        );
        if (response.status() !== 200) {
          throw new Error(`Product API returned ${response.status()}.`);
        }

        const payload = (await response.json()) as {
          products?: Array<{ slug?: string; name?: string }>;
        };
        const product = payload.products?.find((candidate) => candidate.slug);
        if (!product?.slug) {
          throw new Error("No physical products are available for storefront smoke.");
        }

        return {
          slug: product.slug,
          name: product.name ?? product.slug,
        };
      },
    );

    await runStep(steps, "products-page", "Open Product List", async () => {
      await page.goto(`${baseUrl}/products`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#product-list-root");

      const productLink = page.locator(
        `#product-list-root a[href="/products/${physicalProduct.slug}"]`,
      );
      if ((await productLink.count()) === 0) {
        throw new Error(`Product list did not render /products/${physicalProduct.slug}.`);
      }

      return `Found ${physicalProduct.name} in the storefront grid.`;
    });

    await runStep(steps, "product-page", "Open Product Detail", async () => {
      await page.goto(`${baseUrl}/products/${physicalProduct.slug}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForSelector("[data-add-to-cart]");

      const addToCartButton = page.locator("[data-add-to-cart]").first();
      if (!(await addToCartButton.isVisible())) {
        throw new Error("Product detail page did not render a visible add-to-cart button.");
      }

      return `Product detail loaded for ${physicalProduct.name}.`;
    });

    await runStep(steps, "add-to-cart", "Add Product To Cart", async () => {
      const addToCartResponsePromise = page.waitForResponse((response) => {
        return response.url().includes("/api/cart/items") && response.request().method() === "POST";
      });

      await page.locator("[data-add-to-cart]").first().click();
      const addToCartResponse = await addToCartResponsePromise;
      if (addToCartResponse.status() !== 201) {
        const body = await addToCartResponse.text();
        throw new Error(
          `Add-to-cart returned ${addToCartResponse.status()}: ${body || "no response body"}`,
        );
      }

      return "Product added to cart via product detail page.";
    });

    await runStep(steps, "cart", "Open Cart", async () => {
      await page.goto(`${baseUrl}/cart`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-cart-content]");

      const itemCount = await page.locator("[data-cart-item]").count();
      if (itemCount < 1) {
        throw new Error("Cart page did not render any cart items after add-to-cart.");
      }

      await mkdir(dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return `Cart rendered with ${itemCount} item(s).`;
    });

    await runStep(steps, "checkout", "Start Checkout", async () => {
      const checkoutResponsePromise = page.waitForResponse((response) => {
        return response.url().includes("/api/checkout") && response.request().method() === "POST";
      });

      await page.locator("[data-checkout-btn]").first().click();
      const checkoutResponse = await checkoutResponsePromise;
      const responseBody = await checkoutResponse
        .json()
        .catch(() => null as { url?: string; error?: string; message?: string } | null);

      if (checkoutResponse.status() !== 200) {
        throw new Error(
          `Checkout start returned ${checkoutResponse.status()}: ${
            responseBody?.error ?? responseBody?.message ?? "unknown error"
          }`,
        );
      }

      if (!responseBody?.url) {
        throw new Error("Checkout start returned 200 but no checkout URL.");
      }

      return `Checkout session created with redirect URL ${responseBody.url}.`;
    });

    const report: SmokeReport = {
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "passed",
      baseUrl,
      authenticatedEmail,
      screenshotPath,
      steps,
      consoleErrors,
      requestFailures,
    };
    await writeReport(report);
    console.log("Storefront browser smoke passed.");
  } catch (error) {
    const failureScreenshot =
      process.env.SMOKE_STOREFRONT_BROWSER_FAILURE_SCREENSHOT_PATH ??
      "output/smoke/storefront-browser-failure.png";
    await mkdir(dirname(failureScreenshot), { recursive: true });
    await page.screenshot({ path: failureScreenshot, fullPage: true }).catch(() => {});

    const report: SmokeReport = {
      startedAt,
      finishedAt: new Date().toISOString(),
      status: "failed",
      baseUrl,
      authenticatedEmail,
      screenshotPath: failureScreenshot,
      steps,
      consoleErrors,
      requestFailures,
    };
    await writeReport(report);
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`Storefront browser smoke failed: ${detail}`);
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch(async (error) => {
  const detail = error instanceof Error ? error.message : String(error);
  const report: SmokeReport = {
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    status: "failed",
    baseUrl: process.env.SMOKE_BASE_URL?.trim() || null,
    authenticatedEmail: null,
    screenshotPath: null,
    steps: [
      {
        id: "crash",
        label: "Crash",
        status: "failed",
        durationMs: 0,
        detail,
      },
    ],
    consoleErrors: [],
    requestFailures: [],
  };
  await writeReport(report);
  console.error(`Storefront browser smoke crashed: ${detail}`);
  process.exitCode = 1;
});
