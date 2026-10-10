import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, ClipboardList, Ellipsis, Lock, Menu, UtensilsCrossed, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MOBILE_GROUPS = [
  { id: "orders", label: "Orders", icon: ClipboardList, paths: ["/admin/orders", "/admin/payments", "/admin/riders"] },
  { id: "menu", label: "Menu", icon: UtensilsCrossed, paths: ["/admin/dishes", "/admin/inventory", "/admin/coupons"] },
  { id: "insights", label: "Insights", icon: BarChart3, paths: ["/admin/reports", "/admin/billing", "/admin/activity"] },
] as const;

export type ConsoleNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  /** Shows a small lock: the current plan doesn't include this page. */
  locked?: boolean;
};

/**
 * Shared luxury console chrome for the owner + rider apps.
 * Desktop: fixed champagne rail. Mobile: sticky brass top bar with a slide-out
 * drawer plus a thumb-reachable bottom tab bar.
 */
export function ConsoleShell({
  brand,
  className,
  title,
  badge,
  nav,
  sidebar,
  footer,
  children,
}: {
  brand: string;
  className?: string;
  title: string;
  badge: ReactNode;
  nav: readonly ConsoleNavItem[];
  sidebar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = nav.some((item) => item.to.startsWith("/admin"));
  const matches = (item: ConsoleNavItem) => item.exact ? pathname === item.to || pathname === `${item.to}/` : pathname === item.to || pathname.startsWith(`${item.to}/`);
  const home = nav.find((item) => item.to === "/admin") ?? nav.find((item) => item.to === "/admin/pos");
  const groups = MOBILE_GROUPS.map((group) => ({ ...group, items: nav.filter((item) => group.paths.some((path) => path === item.to) && item !== home) })).filter((group) => group.items.length);
  const remaining = nav.filter((item) => item !== home && !groups.some((group) => group.items.includes(item)));
  const mobileGroups = [...groups, ...(remaining.length ? [{ id: "more", label: "More", icon: Ellipsis, items: remaining }] : [])];
  const currentPage = nav.find(matches)?.label ?? title;

  useEffect(() => {
    setOpen(false);
    setActiveGroup(null);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const rail = (
    <div className="flex h-full flex-col gap-6 px-5 py-6">
      <div>
        <p className="eyebrow">{brand}</p>
        <h1 className="num-lux mt-1 text-2xl leading-none text-frost">{title}</h1>
        <div className="mt-2">{badge}</div>
      </div>

      {sidebar ? <div className="hidden lg:block">{sidebar}</div> : null}

      <nav aria-label="Console pages" className="flex flex-col gap-1.5">
        {nav.map(({ to, label, icon: Icon, exact, locked }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: Boolean(exact) }}
            activeProps={{
              className:
                "bg-gradient-to-r from-lux/25 to-transparent text-lux border-lux/40 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
            }}
            className="inline-flex items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-mist/80 transition hover:border-lux/20 hover:bg-lux/5 hover:text-frost"
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {locked ? <Lock className="h-3 w-3 text-lux/70" aria-label="Upgrade to unlock" /> : null}
          </Link>
        ))}
      </nav>

      {footer ? <div className="mt-auto space-y-2 pb-4">{footer}</div> : null}
    </div>
  );

  return (
    <div className={cn("console-shell min-h-screen text-frost", className)}>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 lg:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-lux/15 bg-ink-deep/95 px-4 py-2 backdrop-blur-xl">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold text-mist">{brand}</p>
          <p className="truncate text-sm font-bold text-frost">{currentPage}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          aria-expanded={open}
          title="All pages and account"
          onClick={() => setOpen(true)}
          className="h-10 w-10 shrink-0 text-lux hover:bg-lux/10"
        >
          <Menu className="h-4 w-4" />
        </Button>
        </div>
        <div className="gold-bar" />
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <Button
            variant="ghost"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-deep/80 backdrop-blur-sm"
          />
          <aside role="dialog" aria-modal="true" aria-label="All console pages" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className="console-shell absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-y-auto border-r border-lux/20 bg-ink-deep shadow-lux-lift">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-lux/25 text-lux"
            >
              <X className="h-4 w-4" />
            </Button>
            {rail}
          </aside>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[1500px] flex-col lg:flex-row">
        <aside className="hidden border-lux/10 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-r">
          {rail}
        </aside>

        <main className="console-main min-w-0 flex-1 px-3 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-lux/15 bg-ink-deep/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {isAdmin ? (
          <ul className="mx-auto flex max-w-lg items-stretch gap-1">
            {home ? <li className="min-w-0 flex-1">
              <Button asChild variant="ghost" className={cn("admin-mobile-tab", matches(home) && "admin-mobile-tab-active")}>
                <Link to={home.to} activeOptions={{ exact: true }} aria-label={home.label} aria-current={matches(home) ? "page" : undefined}>
                  <home.icon /><span>{home.to === "/admin" ? "Home" : "POS"}</span>
                </Link>
              </Button>
            </li> : null}
            {mobileGroups.map(({ id, label, icon: Icon, items }) => {
              const active = items.some(matches);
              return <li key={id} className="min-w-0 flex-1">
                <Popover open={activeGroup === id} onOpenChange={(value) => setActiveGroup(value ? id : null)}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" aria-label={`${label} options`} className={cn("admin-mobile-tab", (active || activeGroup === id) && "admin-mobile-tab-active")}>
                      {activeGroup === id ? <X /> : <Icon />}<span>{label}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" sideOffset={14} collisionPadding={12} className="admin-mobile-options w-[min(340px,calc(100vw-24px))] border-lux/25 bg-ink-deep p-4 text-frost shadow-lux-lift lg:hidden" aria-label={`${label} pages`}>
                    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <p className="text-sm font-bold">{label}</p>
                      <Button size="icon" variant="ghost" aria-label={`Close ${label} options`} onClick={() => setActiveGroup(null)} className="h-8 w-8 text-mist hover:bg-lux/10"><X /></Button>
                    </div>
                    <div className="grid max-h-[min(420px,60dvh)] grid-cols-3 gap-x-2 gap-y-4 overflow-y-auto">
                      {items.map((item) => <Button key={item.to} asChild variant="ghost" className="admin-mobile-option">
                        <Link to={item.to} onClick={() => setActiveGroup(null)} aria-current={matches(item) ? "page" : undefined}>
                          <span className={cn("admin-mobile-orbit", matches(item) && "admin-mobile-orbit-active")}>
                            <item.icon />{item.locked ? <Lock className="admin-mobile-lock" aria-label="Upgrade to unlock" /> : null}
                          </span>
                          <span className="admin-mobile-option-label">{item.label}</span>
                        </Link>
                      </Button>)}
                    </div>
                  </PopoverContent>
                </Popover>
              </li>;
            })}
          </ul>
        ) : (
        <ul className="flex items-stretch">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <li key={to} className="min-w-0 flex-1">
              <Link
                to={to}
                activeOptions={{ exact: Boolean(exact) }}
                activeProps={{ className: "tab-3d-active" }}
                className={cn(
                  "tab-3d group flex flex-col items-center gap-1 px-1 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-dim",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
        )}
      </nav>
    </div>
  );
}
