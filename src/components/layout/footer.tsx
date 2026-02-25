import type { FC } from "hono/jsx";

interface FooterColumn {
  title: string;
  links: { label: string; href: string }[];
}

const columns: FooterColumn[] = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/shop" },
      { label: "Collections", href: "/shop/collections" },
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

export const Footer: FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer class="border-t border-gray-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand column */}
          <div class="col-span-2 md:col-span-1">
            <a href="/" class="flex items-center gap-1.5">
              <span class="text-2xl" aria-hidden="true">
                🐾
              </span>
              <span class="text-xl font-bold text-brand-500 tracking-tight">
                petm8
              </span>
            </a>
            <p class="mt-3 text-sm text-gray-500 max-w-xs">
              Personalized pet products, local events, and AI-powered designs
              — made for pets and the people who love them.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 class="text-sm font-semibold text-gray-900">{col.title}</h4>
              <ul class="mt-3 flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      class="text-sm text-gray-500 hover:text-brand-500 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div class="mt-10 border-t border-gray-100 pt-6">
          <p class="text-center text-xs text-gray-400">
            &copy; {year} petm8. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
