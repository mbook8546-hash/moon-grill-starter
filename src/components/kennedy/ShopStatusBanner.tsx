import { PauseCircle } from "lucide-react";
import { useShopSettings } from "@/lib/shop-settings";

/** Shown on the shop when the restaurant has paused online orders or is closed. */
export function ShopStatusBanner() {
  const s = useShopSettings();
  if (!s || (!s.pause_online_orders && s.is_open_now)) return null;
  const msg = s.pause_online_orders
    ? s.pause_message || "Online orders are paused for a little while."
    : `We're closed right now${s.next_open_at ? ` · opens ${new Date(s.next_open_at).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}` : ""}.`;
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-flame/40 bg-flame/10 px-4 py-3 text-sm font-semibold text-charcoal">
      <PauseCircle className="h-4 w-4 shrink-0 text-flame" /> {msg}
    </div>
  );
}
