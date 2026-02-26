import type { FC } from "hono/jsx";
import { Header } from "../../components/layout/header";
import { Footer } from "../../components/layout/footer";
import { CartDrawer } from "../../components/cart/cart-drawer";

interface LayoutProps {
  title?: string;
  description?: string;
  children: any;
  stripePublishableKey?: string;
  activePath?: string;
  isAuthenticated?: boolean;
  cartCount?: number;
  ogImage?: string;
  ogType?: string;
  url?: string;
  jsonLd?: Record<string, any>;
  storeName?: string;
  storeLogo?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  /** Product-specific OG: price amount (e.g. "29.99") */
  ogPriceAmount?: string;
  /** Product-specific OG: price currency (e.g. "USD") */
  ogPriceCurrency?: string;
}

export const Layout: FC<LayoutProps> = ({
  title,
  description,
  children,
  stripePublishableKey,
  activePath,
  isAuthenticated,
  cartCount,
  ogImage = "https://petm8.io/og-image.jpg",
  ogType = "website",
  url = "https://petm8.io",
  jsonLd,
  storeName = "petm8",
  storeLogo,
  primaryColor,
  secondaryColor,
  ogPriceAmount,
  ogPriceCurrency,
}) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title ? `${title} | ${storeName}` : `${storeName} — Commerce`}</title>
      {description && <meta name="description" content={description} />}
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={url} />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="apple-touch-icon" href="/favicon-192.png" />

      {/* Open Graph / Facebook */}
      <meta property="og:site_name" content={storeName} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title ? `${title} | ${storeName}` : `${storeName} — Commerce`} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />
      {ogPriceAmount && <meta property="product:price:amount" content={ogPriceAmount} />}
      {ogPriceCurrency && <meta property="product:price:currency" content={ogPriceCurrency} />}

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title ? `${title} | ${storeName}` : `${storeName} — Commerce`} />
      {description && <meta property="twitter:description" content={description} />}
      <meta property="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* E2: Font optimization — preload Inter WOFF2 so text renders immediately */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        rel="preload"
        href="https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2"
        as="font"
        type="font/woff2"
        crossorigin=""
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* E3: Critical CSS inlined for instant first paint */}
      <style dangerouslySetInnerHTML={{ __html: [
        "/* font-display: swap ensures text stays visible while fonts load (E2) */",
        "@font-face{font-family:'Inter';font-style:normal;font-display:swap;src:url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2) format('woff2');}",
        "/* Critical-path layout */",
        "*,*::before,*::after{box-sizing:border-box;margin:0;}",
        "html{line-height:1.5;-webkit-text-size-adjust:100%;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;}",
        "body{min-height:100vh;display:flex;flex-direction:column;background-color:#F9FAFB;color:#111827;}",
        ".dark body{background-color:#111827;color:#F3F4F6;}",
        "/* Navbar critical */",
        "header{position:sticky;top:0;z-index:40;border-bottom:1px solid #E5E7EB;background:rgba(255,255,255,.8);backdrop-filter:blur(12px);}",
        ".dark header{background:rgba(17,24,39,.8);border-color:#374151;}",
        "header>div{max-width:80rem;margin:0 auto;display:flex;align-items:center;justify-content:space-between;height:4rem;padding:0 1rem;}",
        "main{flex:1;}",
        "/* Typography + button baseline */",
        "h1,h2,h3{font-weight:700;line-height:1.25;}",
        "a{color:inherit;text-decoration:none;}",
        ".btn-primary{display:inline-flex;align-items:center;justify-content:center;padding:.625rem 1.25rem;font-weight:600;font-size:.875rem;border-radius:.75rem;background-color:#4F46E5;color:#fff;transition:background-color .15s;}",
        ".btn-primary:hover{background-color:#4338CA;}",
        ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;}",
      ].join("\n") }} />

      {/* E3: Full Tailwind CSS loaded non-blocking for non-critical styles */}
      <link
        rel="stylesheet"
        href="/styles/output.css"
        media="print"
        onload="this.media='all'"
      />
      {/* Fallback for browsers with JS disabled */}
      <noscript>
        <link rel="stylesheet" href="/styles/output.css" />
      </noscript>

      {stripePublishableKey && (
        <script src="https://js.stripe.com/v3/" />
      )}

      {/* Dark mode - apply immediately to prevent flash (static trusted script) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var s=localStorage.getItem("petm8-dark-mode");if(s==="dark"||(s!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}})();`,
        }}
      />
    </head>
    <body
      class="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-200"
      style={primaryColor || secondaryColor ? `--primary-color: ${primaryColor ?? "#4F46E5"}; --secondary-color: ${secondaryColor ?? "#10B981"};` : undefined}
    >
      {/* Skip to content link for keyboard users */}
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-brand-500 focus:text-white focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Screen reader announcer for dynamic updates */}
      <div id="announcer" aria-live="polite" aria-atomic="true" class="sr-only"></div>

      <Header
        activePath={activePath}
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
        storeName={storeName}
        storeLogo={storeLogo}
      />
      <main id="main-content" role="main" class="flex-1">{children}</main>
      <Footer />
      <CartDrawer />

      {/* Page title announcement for screen readers (static trusted script) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.addEventListener("DOMContentLoaded",function(){var a=document.getElementById("announcer");if(a){a.textContent=document.title+" page loaded";}});`,
        }}
      />

      {/* Analytics tracking (static trusted script, no user input) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function () {
              window.petm8Track = function (eventName, payload) {
                try {
                  window.dataLayer = window.dataLayer || [];
                  window.dataLayer.push({
                    event: eventName,
                    ...payload,
                    ts: new Date().toISOString(),
                  });
                  if (window.gtag) {
                    window.gtag("event", eventName, payload || {});
                  }
                  navigator.sendBeacon(
                    "/api/analytics/events",
                    JSON.stringify({ eventName: eventName, payload: payload || {} })
                  );
                } catch (_) {}
              };
            })();
          `,
        }}
      />
      <script src="/scripts/darkmode.js" defer />
      <script src="/scripts/toast.js" defer />
      <script src="/scripts/cart.js" defer />
      <script src="/scripts/gallery.js" defer />
      <script src="/scripts/variant-selector.js" defer />
      <script src="/scripts/booking.js" defer />
      <script src="/scripts/studio.js" defer />
      <script src="/scripts/auth.js" defer />
    </body>
  </html>
);
