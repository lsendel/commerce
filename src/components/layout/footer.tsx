import type { FC } from "hono/jsx";

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

interface SocialLink {
  platform: string;
  url: string;
}

interface FooterProps {
  storeName?: string;
  socialLinks?: SocialLink[];
}

const columns: FooterColumn[] = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/products" },
      { label: "Collections", href: "/products" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Orders", href: "/account/orders" },
      { label: "My Pets", href: "/account/pets" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

const socialIcons: Record<string, string> = {
  instagram: "M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 01-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 017.8 2m-.2 2A3.6 3.6 0 004 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 003.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 110 2.5 1.25 1.25 0 010-2.5M12 7a5 5 0 110 10 5 5 0 010-10m0 2a3 3 0 100 6 3 3 0 000-6z",
  facebook: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z",
  twitter: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
  tiktok: "M9 12a4 4 0 104 4V4a5 5 0 005 5",
  youtube: "M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29.94 29.94 0 001 12a29.94 29.94 0 00.46 5.58A2.78 2.78 0 003.4 19.6C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29.94 29.94 0 0023 12a29.94 29.94 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
};

export const Footer: FC<FooterProps> = ({
  storeName = "petm8",
  socialLinks,
}) => {
  const year = new Date().getFullYear();

  return (
    <footer class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" role="contentinfo">
      <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div class="col-span-2 md:col-span-1">
            <a href="/" class="flex items-center gap-1.5" aria-label={`${storeName} home`}>
              <svg class="h-7 w-7 text-brand-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4.5 11.5c-1.38 0-2.5-1.57-2.5-3.5S3.12 4.5 4.5 4.5 7 6.07 7 8s-1.12 3.5-2.5 3.5zm15 0c-1.38 0-2.5-1.57-2.5-3.5s1.12-3.5 2.5-3.5S22 6.07 22 8s-1.12 3.5-2.5 3.5zM12 21c-4.42 0-8-2.69-8-6 0-1.66.68-3.17 1.79-4.35C6.57 9.85 8 9.5 8 8.5c0-.28.22-.5.5-.5s.5.22.5.5c0 1-1.43 1.35-2.21 2.15C5.69 11.78 5 13.32 5 15c0 2.76 3.13 5 7 5s7-2.24 7-5c0-1.68-.69-3.22-1.79-4.35C16.43 9.85 15 9.5 15 8.5c0-.28.22-.5.5-.5s.5.22.5.5c0 1 1.43 1.35 2.21 2.15C19.32 11.83 20 13.34 20 15c0 3.31-3.58 6-8 6z"/>
              </svg>
              <span class="text-xl font-bold text-brand-500 tracking-tight">
                {storeName}
              </span>
            </a>
            <p class="mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Personalized pet products, local events, and AI-powered designs
              — made for pets and the people who love them.
            </p>

            {/* Social links */}
            {socialLinks && socialLinks.length > 0 && (
              <div class="mt-4 flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-gray-400 dark:text-gray-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                    aria-label={`${storeName} on ${social.platform}`}
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d={socialIcons[social.platform.toLowerCase()] || socialIcons.instagram} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{col.title}</h4>
              <ul class="mt-3 flex flex-col gap-2" role="list">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      class="text-sm text-gray-500 dark:text-gray-400 hover:text-brand-500 dark:hover:text-brand-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div class="mt-10 border-t border-gray-100 dark:border-gray-800 pt-6">
          <p class="text-center text-xs text-gray-400 dark:text-gray-500">
            &copy; {year} {storeName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
