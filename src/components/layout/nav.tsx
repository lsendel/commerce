import type { FC } from "hono/jsx";

export interface NavLink {
  label: string;
  href: string;
  /** Only show when user is authenticated */
  auth?: boolean;
  /** Only show for specific roles */
  roles?: string[];
  /** Only show for affiliates */
  affiliate?: boolean;
}

export const navLinks: NavLink[] = [
  { label: "Shop", href: "/products" },
  { label: "Events", href: "/events" },
  { label: "Studio", href: "/studio" },
  { label: "Account", href: "/account", auth: true },
  { label: "Admin", href: "/admin/products", auth: true, roles: ["owner", "admin", "store_owner"] },
  { label: "Affiliates", href: "/affiliates/dashboard", auth: true, affiliate: true },
];

interface NavProps {
  activePath?: string;
  isAuthenticated?: boolean;
  userRole?: string;
  isAffiliate?: boolean;
  /** Vertical layout for mobile menu */
  vertical?: boolean;
}

export const Nav: FC<NavProps> = ({
  activePath = "",
  isAuthenticated = false,
  userRole,
  isAffiliate = false,
  vertical = false,
}) => {
  const filteredLinks = navLinks.filter((link) => {
    if (link.auth && !isAuthenticated) return false;
    if (link.roles && (!userRole || !link.roles.includes(userRole))) return false;
    if (link.affiliate && !isAffiliate) return false;
    return true;
  });

  const containerClass = vertical
    ? "flex flex-col gap-1"
    : "flex items-center gap-1";

  return (
    <nav class={containerClass} aria-label={vertical ? "Mobile navigation" : "Main navigation"}>
      {filteredLinks.map((link) => {
        const isActive =
          activePath === link.href ||
          (link.href !== "/" && activePath.startsWith(link.href));

        return (
          <a
            key={link.href}
            href={link.href}
            class={`rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
            } ${vertical ? "w-full" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
};
