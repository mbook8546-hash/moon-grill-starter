/**
 * One shared settings source for the customer shop, the POS and the admin.
 * Public read: GET /tenants/{slug}/settings/public/ (no auth). Admin edits via
 * PATCH /admin/settings/. See do_backend.md section E.4.
 */
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { currentTenantSlug } from "@/lib/tenant";

export type DayHours = { day: string; open: string; close: string; closed: boolean };
export type PublicShopSettings = {
  tax_percent: number;
  service_charge_percent: number;
  min_order: number;
  delivery_fee: number;
  free_delivery_over: number;
  pause_online_orders: boolean;
  pause_message?: string | null;
  is_open_now: boolean;
  next_open_at?: string | null;
  hours: DayHours[];
  timezone: string;
};

export const SHOP_SETTINGS_PATH = (slug: string) => `/tenants/${slug}/settings/public/`;

export function useShopSettings() {
  const [s, setS] = useState<PublicShopSettings | null>(null);
  useEffect(() => {
    const slug = currentTenantSlug();
    if (!slug) return;
    let alive = true;
    const load = () => api.get<PublicShopSettings>(SHOP_SETTINGS_PATH(slug)).then((r) => alive && r && setS(r)).catch(() => {});
    void load();
    const t = setInterval(load, 60_000); // pause switch flips should reach open carts within a minute
    return () => { alive = false; clearInterval(t); };
  }, []);
  return s;
}
