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
}

export const Layout: FC<LayoutProps> = ({
  title,
  description,
  children,
  stripePublishableKey,
  activePath,
  isAuthenticated,
  cartCount,
}) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title ? `${title} | petm8` : "petm8 — Pet Commerce"}</title>
      {description && <meta name="description" content={description} />}
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
    <body class="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <Header
        activePath={activePath}
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
      />
      <main class="flex-1">{children}</main>
      <Footer />
      <script src="/scripts/cart.js" />
    </body>
  </html>
);
