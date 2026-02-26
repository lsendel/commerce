import type { FC, Child } from "hono/jsx";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import type { Breadcrumb } from "../ui/types";

interface AdminShellProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  storeName: string;
  storeId?: string;
  userName?: string;
  children: Child;
  scripts?: string[];
  activePath?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

// Static trusted CSS — no user input
const criticalCss = [
  "@font-face{font-family:'Inter';font-style:normal;font-display:swap;src:url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.woff2) format('woff2');}",
  "*,*::before,*::after{box-sizing:border-box;margin:0;}",
  "html{line-height:1.5;-webkit-text-size-adjust:100%;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;}",
  "body{min-height:100vh;background-color:#F9FAFB;color:#111827;}",
  ".dark body{background-color:#111827;color:#F3F4F6;}",
  "a{color:inherit;text-decoration:none;}",
  ".sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0;}",
].join("\n");

// Static trusted dark mode init script — no user input
const darkModeScript = `(function(){var s=localStorage.getItem("petm8-dark-mode");if(s==="dark"||(s!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}})();`;

export const AdminShell: FC<AdminShellProps> = ({
  title,
  breadcrumbs,
  storeName,
  userName,
  children,
  scripts = [],
  activePath,
  primaryColor,
  secondaryColor,
}) => (
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{`${title} | ${storeName} Admin`}</title>
      <meta name="robots" content="noindex,nofollow" />
      <link rel="icon" href="/favicon.ico" sizes="any" />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Static trusted CSS */}
      <style dangerouslySetInnerHTML={{ __html: criticalCss }} />

      <link
        rel="stylesheet"
        href="/styles/output.css"
        media="print"
        onload="this.media='all'"
      />
      <noscript>
        <link rel="stylesheet" href="/styles/output.css" />
      </noscript>

      {/* Static trusted dark mode init */}
      <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
    </head>
    <body
      class="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100"
      style={primaryColor || secondaryColor ? `--primary-color: ${primaryColor ?? "#4F46E5"}; --secondary-color: ${secondaryColor ?? "#10B981"};` : undefined}
    >
      <div id="announcer" aria-live="polite" aria-atomic="true" class="sr-only"></div>

      <AdminSidebar activePath={activePath} />

      {/* Mobile sidebar overlay */}
      <div id="admin-sidebar-overlay" class="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm hidden lg:hidden" aria-hidden="true" />

      <div class="lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          storeName={storeName}
          userName={userName}
          breadcrumbs={breadcrumbs}
        />

        <main id="main-content" class="flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>

      <script src="/scripts/darkmode.js" defer />
      <script src="/scripts/toast.js" defer />
      <script src="/scripts/auth.js" defer />
      <script src="/scripts/admin-shell.js" defer />
      {scripts.map((s) => (
        <script key={s} src={`/scripts/${s}`} defer />
      ))}
    </body>
  </html>
);
