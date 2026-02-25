import type { FC } from "hono/jsx";
import { Header } from "../../components/layout/header";
import { Footer } from "../../components/layout/footer";

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
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title ? `${title} | ${storeName}` : `${storeName} — Commerce`} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />

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

      <link rel="stylesheet" href="/styles/output.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      {stripePublishableKey && (
        <script src="https://js.stripe.com/v3/" />
      )}
    </head>
    <body
      class="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col"
      style={primaryColor || secondaryColor ? `--primary-color: ${primaryColor ?? "#4F46E5"}; --secondary-color: ${secondaryColor ?? "#10B981"};` : undefined}
    >
      <Header
        activePath={activePath}
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
        storeName={storeName}
        storeLogo={storeLogo}
      />
      <main class="flex-1">{children}</main>
      <Footer />
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
      <script src="/scripts/cart.js" defer />
      <script src="/scripts/booking.js" defer />
      <script src="/scripts/studio.js" defer />
      <script src="/scripts/auth.js" defer />
    </body>
  </html>
);
