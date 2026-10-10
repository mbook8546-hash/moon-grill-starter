# Backend work list — Platform Owner Console

The platform owner page (`/platform`) is now a full SaaS-owner console. It reads your Django
API at `VITE_API_BASE_URL`. Everything below is listed by endpoint: **what to build, method,
request and response JSON**, so each item can be implemented one at a time.

Endpoints already working (do not change):

| Endpoint | Used for |
|---|---|
| `GET /platform/stats/` | Overview numbers |
| `GET /platform/tenants/` · `POST /platform/tenants/` | Restaurant list · add restaurant |
| `GET /platform/tenants/{slug}/` · `PATCH` · `DELETE` | Detail · pause/resume/profile/plan · delete |
| `PATCH /platform/tenants/{slug}/subscription/` | Change plan / status |
| `GET /platform/invoices/` · `POST /platform/invoices/{id}/verify/` | Invoices · approve/reject proof |
| `GET /whatsapp/qr/` · `POST /whatsapp/restart/` · `POST /whatsapp/logout/` | WhatsApp connect |

Today the UI calls these **new** endpoints too. Until each one exists, the page keeps the
change on screen only (sample data) and shows the owner a "backend isn't ready yet" note.
The console detects 404/405/501 as "not built" — so ship them in any order.

---

## 1. `GET /platform/stats/trend/` — charts
Response:
```json
[{"month": "Nov", "mrr": 12000, "orders": 4200, "signups": 3, "churn": 0}]
```
Last 12 months, `mrr` = subscription income in PKR for that month.

## 2. Plans
- `GET /platform/plans/` → list (already called; return full objects, see model below)
- `POST /platform/plans/` · `PATCH /platform/plans/{slug}/` · `DELETE`
```json
{"slug":"growth-plan","name":"Growth","price_pkr":10000,"interval":"month",
 "orders_per_day":500,"staff_seats":15,"branches":3,
 "features":["WhatsApp ordering","AI voice orders"],"is_public":true}
```

## 3. `GET /platform/tenants/{slug}/users/` — restaurant staff
```json
[{"id":1,"name":"Hussnain","username":"hussnain","role":"owner","phone":"+92…","last_login":"…","is_active":true}]
```
Also: `PATCH .../users/{id}/` (`is_active` lock/unlock) and
`POST .../users/{id}/reset-password/` (sets a temporary password, forces change at next login).

## 4. `PATCH /platform/tenants/{slug}/features/` — feature switches & limits
```json
{"ai_voice": true, "whatsapp": false, "riders": true, "pos": true, "multi_branch": false, "coupons": true,
 "limits": {"orders_per_day": 500, "staff_seats": 15, "branches": 3}}
```
Feature keys must apply in the tenant's app: `ai_voice`, `whatsapp`, `riders`, `pos`,
`multi_branch`, `coupons`. `limits` override the plan (null = use plan default).
Enforce `limits.orders_per_day` when the tenant takes orders.

## 5. `POST /platform/tenants/{slug}/impersonate/` — "Open their admin"
Response: `{"token": "…", "expire_seconds": 3600}` — a short-lived superuser-signed token
that authenticates the console as that tenant's owner. Log the impersonation in the audit log.

## 6. Invoices
- `GET /platform/invoices/` (already used) — add optional `?status=`
- `POST /platform/invoices/` — `{"tenant_slug": "…", "amount_pkr": 6000, "admin_notes": "…"}`
- `POST /platform/invoices/{id}/remind/` — sends WhatsApp + email reminder
- Extend `verify` payload to `{"action": "approve"|"reject", "admin_notes": "…"}` (approve must
  mark the subscription `active` and push `current_period_end` forward)

## 7. `GET/POST /platform/tickets/` — support requests
```json
{"id":"T-311","tenant_slug":"…","tenant_name":"…","subject":"…","body":"…",
 "priority":"low|normal|high|urgent","status":"open|pending|resolved",
 "created_at":"…","assignee":"…","replies":[{"from":"…","body":"…","at":"…"}]}
```
Also: `PATCH /platform/tickets/{id}/` (priority, status, assignee) and
`POST /platform/tickets/{id}/reply/` `{"body": "…"}` — reply must reach the restaurant owner
on WhatsApp and email.

## 8. `GET/POST /platform/announcements/`
```json
{"id":"A-1","title":"…","body":"…","audience":"all|active|trialing|past_due|<slug>",
 "channels":["banner","whatsapp","email"],"status":"draft|scheduled|sent","send_at":"…"}
```
`banner` shows a dismissible banner inside each restaurant's admin page — the tenant app needs
a `GET /announcements/` (tenant-scoped) to fetch active banners.

## 9. `GET/POST /platform/team/` · `PATCH /platform/team/{id}/` — platform staff
```json
{"id":"u1","name":"…","email":"…","role":"super_owner|finance|support|sales|viewer",
 "two_factor":true,"last_active":"…","status":"active|invited|disabled"}
```
Roles must be enforced server-side on the platform endpoints (finance → billing only, etc.).
POST sends an email invite. `two_factor` comes from the auth system.

## 10. `GET /platform/audit/` — activity log
```json
[{"id":"…","at":"…","actor":"…","action":"Approved invoice #1043","target":"Kennedy Moon Grill",
  "category":"tenant|billing|team|security|settings|support","ip":"…"}]
```
Write one row for every platform-owner action (backend should log its own mutations too).

## 11. `GET/PATCH /platform/settings/`
```json
{"platform_name":"Kennedy SaaS","support_email":"…","support_whatsapp":"…",
 "default_plan":"free-trial","trial_days":15,"grace_days":5,"auto_pause_unpaid":true,
 "signup_mode":"open|approval|closed","maintenance_mode":false,
 "payout_jazzcash":"…","payout_bank":"…","terms_url":"…"}
```
`grace_days` + `auto_pause_unpaid` should drive a scheduled job: unpaid past grace → pause tenant.

## 12. `GET /platform/integrations/` — service health
```json
[{"key":"whatsapp","name":"WhatsApp (Evolution)","description":"…",
  "status":"connected|degraded|disconnected","last_check":"…","detail":"4 of 6 restaurants connected"}]
```
Keys used by the UI: `api`, `whatsapp`, `elevenlabs`, `jazzcash`, `email`, `sms`.
The `api` entry is overwritten client-side by a live ping — the rest come from here.

## 13. Extend tenant list/detail payloads
So the console can stop sampling, include on each tenant object:
```json
{"city":"…","owner_name":"…","owner_email":"…","owner_phone":"…","domain":"…",
 "orders_today":64,"orders_total":18420,"revenue_today":92000,"revenue_total":5200000,
 "staff_count":12,"branch_count":2,"whatsapp_connected":true,"health_score":92,
 "features":{"ai_voice":true,"whatsapp":true,"riders":true,"pos":false,"multi_branch":true,"coupons":true},
 "limits":{"orders_per_day":500,"staff_seats":15,"branches":3}}
```
`health_score` (0–100) suggestion: 100 − 30×past_due − 20×whatsapp_disconnected − 15×(orders<25% of usual) …

---

### Priority order
1. Tenant payload extensions + `users/` + `features/` (biggest owner value)
2. `impersonate/` (fast to build, huge convenience)
3. `plans/` CRUD + `stats/trend/`
4. `settings/` + `audit/`
5. `tickets/` + `announcements/` + `team/` + `integrations/` + invoice additions

## WhatsApp own-number policy (OTP + order messages)

Each restaurant links its own WhatsApp number by scanning the QR in its admin (`/whatsapp/qr/?tenant=`). Add these fields to `GET/PATCH /platform/settings/`:

| Field | Type | Meaning |
|---|---|---|
| `wa_require_own_number` | bool | Restaurant must link its own number; never send from a shared platform number |
| `wa_sms_fallback` | bool | If tenant WhatsApp is not connected or a send fails, send the OTP by SMS |
| `wa_block_until_linked` | bool | After `wa_link_grace_days`, restaurant admin shows a blocking "Link WhatsApp" screen |
| `wa_link_grace_days` | int | Days after signup to link before blocking/strict reminders |
| `wa_reminder_hours` | int | Remind disconnected restaurant owners every N hours (0 = off) |

Backend behaviour for `POST /auth/phone/request-code/`: use the tenant's own WhatsApp session; if disconnected or the send errors and `wa_sms_fallback` is true, send SMS and return `channel: "sms"`, `sent_via_whatsapp: false`. If fallback is off, return 503 with a clear message. `/auth/phone/config/` must return `whatsapp_connected` per tenant. Log each fallback in audit (`category: "integrations"`).

---

## Restaurant admin — still missing on the backend (appended)

Each restaurant has its own admin. These are needed by the admin console and are not covered above:

### A. Payment receipt on orders (JazzCash / EasyPaisa)
- Customer checkout uploads a screenshot/PDF: `POST /orders/{id}/payment-proof/` (multipart `file`, max 8 MB, image/* or pdf).
- Every order payload must include `payment_proof_url` (absolute https URL, or null) plus `payment_reference`, `amount_paid`, `paid_at`, `verified_by`.
- Store files per tenant (`tenants/{slug}/receipts/...`), served via signed URL; only that tenant's admin/cashier may read.
- `POST /orders/{id}/verify-payment/` already exists — log approve/reject in the tenant audit log with who and when.

### B. Other admin gaps
- Tenant audit log: `GET /admin/audit/` (staff actions on orders, menu, prices, refunds).
- Refunds: `POST /orders/{id}/refund/` with amount + reason; sets `payment_status=refunded`.
- Opening hours & holiday closures: `GET/PATCH /admin/settings/hours/`; checkout must reject orders when closed.
- Delivery zones & fees per branch: `GET/POST/PATCH /branches/{id}/zones/`.
- Restaurant settings: `GET/PATCH /admin/settings/` (name, logo, tax %, service charge, min order, wallet numbers for JazzCash/EasyPaisa shown at checkout).
- Reports export: `GET /admin/reports/sales/?from=&to=&format=csv`.
- Subscription view for the owner: `GET /admin/subscription/` (plan, limits used, next invoice) mirroring platform data.
- Notifications feed: `GET /admin/notifications/` + WebSocket event `payment_proof_uploaded` so admins see new receipts live.

### C. Restaurant admin endpoints the new admin pages call (scoped to the signed-in tenant)
Until each exists the page shows "Preview data" and keeps changes on screen only (404/405/501 = not built).

| Page | Endpoint | Notes |
|---|---|---|
| Settings | `GET/PATCH /admin/settings/` | Body below. Checkout must read wallet numbers, fees, tax, min order, hours, `pause_online_orders` from here |
| Coupons | `GET/POST /admin/coupons/` · `PATCH/DELETE /admin/coupons/{id}/` | Validate at `/coupons/preview/`: dates, `max_uses`, `per_customer`, `min_order`, `max_discount` |
| Reviews | `GET /admin/reviews/` · `POST /admin/reviews/{id}/reply/` `{reply}` · `PATCH /admin/reviews/{id}/` `{hidden}` | Create a review when the customer rates a delivered order (food, delivery, comment) |
| Activity log | `GET /admin/audit/?category=&q=` | Write a row on every staff mutation (orders, payments, refunds, menu/price, staff, settings) |
| Sales reports | (optional) `GET /admin/reports/sales/?from=&to=&format=csv` | Page computes from loaded orders today; a server version is needed for long ranges |

Settings body:
```json
{"name":"…","phone":"…","address":"…","logo_url":"…","tax_percent":16,"service_charge_percent":0,
 "min_order":500,"delivery_fee":150,"free_delivery_over":3000,"delivery_radius_km":6,
 "jazzcash_number":"…","jazzcash_title":"…","easypaisa_number":"…","easypaisa_title":"…",
 "accept_cod":true,"accept_wallets":true,"require_receipt":true,"auto_accept_orders":false,"pause_online_orders":false,
 "hours":[{"day":"Monday","open":"12:00","close":"00:00","closed":false}],
 "holidays":[{"date":"2026-10-30","note":"Eid — closed"}]}
```
Coupon: `{"id","code","kind":"percent|flat|free_delivery","value","min_order","max_discount","uses","max_uses","per_customer","starts","ends","active"}`
Review: `{"id","order_code","customer","rating","food","delivery","comment","at","reply","hidden"}`
Audit: `{"id","at","actor","role","action","target","category":"order|payment|menu|staff|settings|refund"}`

---

## E. SaaS plan, limits & owner self-service (appended — required for the admin plan bar, locks, billing, support, viewing-as, shared settings, POS shifts)

All `/admin/*` endpoints are scoped to the tenant from the JWT (`request.user` → membership → tenant). Never trust a slug from the body. Every mutation writes a row to the tenant audit log (`/admin/audit/`) and, for platform staff actions, to the platform audit log (`/platform/audit/`). Until an endpoint exists the UI falls back to sample data (404/405/501 = "not built").

### E.1 Entitlement on login — `GET /admin/subscription/`
Also embed the same object as `entitlement` in the login / `GET /auth/me/` response so the admin renders instantly.
```json
{"plan_slug":"growth","plan_name":"Growth","price_pkr":4999,
 "status":"active|trialing|past_due|suspended|cancelled",
 "trial_ends_at":"2026-10-19T00:00:00Z","renews_at":"2026-11-01T00:00:00Z","suspended_reason":null,
 "features":{"pos":true,"whatsapp":true,"riders":true,"coupons":true,"reviews":true,"inventory":true,"branches":false,"reports":false},
 "limits":{"orders_per_day":150,"staff_seats":8,"branches":1},
 "usage":{"orders_today":112,"staff_seats":6,"branches":1}}
```
- `features` = plan defaults merged with per-tenant overrides set via `PATCH /platform/tenants/{slug}/features/`.
- Unlimited = `100000` (UI shows ∞ for ≥ 99999).
- `orders_today` counts non-cancelled orders since local midnight in the tenant timezone (Asia/Karachi). Cache in Redis key `usage:{tenant}:{date}` and increment on order create; rebuild nightly.
- `status` transitions: trialing → active (first paid invoice) · active → past_due (invoice overdue, grace 3 days) → suspended (cron) · suspended → active (proof approved by platform). Run a daily Celery beat task `billing.enforce_status`.

### E.2 Server-side enforcement (mandatory — hiding buttons is not security)
Add a DRF permission/middleware `EntitlementGuard`:
| Condition | Response |
|---|---|
| tenant `status` in `suspended,cancelled` | `402 {"code":"tenant_suspended","detail":"…"}` on every `/admin/*`, `/orders/` create, `/pos/*`, except `/admin/subscription/*`, `/admin/support/*`, `/admin/announcements/*`, `/auth/*` |
| feature off | `403 {"code":"feature_locked","feature":"pos"}` — map: `pos`→`/admin/pos/*`, `whatsapp`→`/admin/whatsapp/*`, `riders`→rider assign/dispatch, `coupons`→`/admin/coupons/*` + coupon apply at checkout, `reviews`→`/admin/reviews/*`, `inventory`→`/admin/inventory/*`, `branches`→creating >1 branch, `reports`→`/admin/reports/*` |
| new order over `orders_per_day` | `429 {"code":"limit_orders_per_day","limit":150}` (customer checkout shows "Restaurant is at capacity today") |
| invite staff over `staff_seats` / create branch over `branches` | `409 {"code":"limit_staff_seats"}` / `{"code":"limit_branches"}` |
Use `select_for_update` on the usage counter when creating orders to avoid races. The frontend should treat 402 by calling `refreshEntitlement()` (shows the paused screen) and 403/409/429 with an upgrade toast.

### E.3 Plans & upgrade
- `GET /admin/subscription/plans/` → `[{"slug","name","price_pkr","orders_per_day","staff_seats","branches","features":["pos",…]}]` (public plans only).
- `POST /admin/subscription/upgrade/` `{"plan_slug":"pro"}` → creates a pending prorated invoice and returns it; plan switches when that invoice is marked paid. Downgrades take effect at `renews_at`. Owner role only.

### E.4 Invoices & JazzCash proof (owner billing page)
- `GET /admin/subscription/invoices/` → `[{"id","number","plan_name","amount_pkr","status":"pending|under_review|paid|overdue","period_start","period_end","due_date","paid_at","proof_url","pay_to":{"method":"JazzCash","number":"03xx…","title":"…"}}]`
- `POST /admin/subscription/invoices/{id}/proof/` multipart `file` (image/* or pdf, ≤ 8 MB) + optional `reference` (JazzCash TID) → sets `status=under_review`, stores at `platform/invoices/{tenant}/{id}/…`, signed URL (15 min). Reject re-upload on `paid`. Notify platform (email + `/platform/invoices/` badge).
- Platform reviews in its existing receipt viewer: `POST /platform/invoices/{id}/approve/` / `reject/ {reason}` → approve sets `paid_at`, reactivates a suspended tenant, audit log both sides.
- `pay_to` comes from `/platform/settings/` (platform JazzCash number) — never hard-code.

### E.5 Announcements
- `GET /admin/announcements/` → `[{"id","title","body","level":"info|feature|warning","at","read"}]` (only those targeted at this tenant's plan or "all", not expired).
- `POST /admin/announcements/{id}/read/` → per-user read receipt (table `announcement_reads(user, announcement)`).

### E.6 Support tickets (appear on platform console `/platform/tickets/`)
- `GET /admin/support/tickets/` · `POST /admin/support/tickets/` `{"subject","category","priority":"low|normal|high","body"}` → `{"id","subject","category","priority","status":"open|waiting|resolved","created_at","messages":[{"from":"restaurant|platform","author","body","at"}]}`
- `POST /admin/support/tickets/{id}/reply/` `{"body"}`; optional `attachment` multipart.
- Platform reply sets `status=waiting`; restaurant reply sets `open`. Email the owner on platform reply.

### E.7 "Viewing as" (impersonation)
- `POST /platform/tenants/{slug}/impersonate/` (superuser only) → returns a short-lived (30 min) access token with claims `{"tenant":slug,"impersonator_id":…,"role":"owner"}`. Write platform audit `Opened restaurant admin` + tenant audit row "Platform support viewed your admin".
- Every request made with an impersonation token logs `actor = "<platform user> (as owner)"` in the tenant audit log.
- `POST /platform/impersonation/end/` `{slug}` → revoke the token (blacklist jti), audit "Exited restaurant admin".
- Block destructive owner actions while impersonating unless `?confirm=1` (delete tenant, change owner password, payout numbers).

### E.8 One shared settings source (shop + POS + admin)
- Admin edits stay at `GET/PATCH /admin/settings/` (body in section C).
- New public read (no auth, cacheable 30 s): `GET /tenants/{slug}/settings/public/` →
```json
{"tax_percent":16,"service_charge_percent":0,"min_order":500,"delivery_fee":150,"free_delivery_over":3000,
 "pause_online_orders":false,"pause_message":null,"is_open_now":true,"next_open_at":null,
 "hours":[{"day":"Monday","open":"12:00","close":"00:00","closed":false}],"timezone":"Asia/Karachi"}
```
- `is_open_now`/`next_open_at` computed server-side from hours + holidays (handle closing after midnight).
- Order create (shop **and** POS) must compute tax/service/delivery from these values server-side, ignore client totals, and reject with `409 {"code":"shop_closed"}` / `{"code":"orders_paused"}` for online orders (POS walk-in allowed while paused).
- Invalidate the cache on PATCH and broadcast WebSocket `settings_updated` to the tenant channel.

### E.9 POS shifts, cash moves & Z report on the server
- `GET /admin/pos/shifts/current/` → open shift for this register/user or `null`: `{"id","opened_at","opened_by","opening_float","cash_moves":[{"id","kind":"in|out","amount","reason","at"}]}`
- `POST /admin/pos/shifts/` `{"opening_float","client_id","register":"counter-1"}` — one open shift per register (409 if exists). `client_id` makes retries idempotent.
- `POST /admin/pos/shifts/{id}/cash-moves/` `{"kind","amount","reason"}`
- `POST /admin/pos/shifts/{id}/close/` `{"counted_cash","expected_cash"}` → server recomputes expected cash from its own orders + moves, stores difference, returns Z report: `{"shift_id","opened_at","closed_at","sales_count","gross","discounts","tax","service","refunds","voids","by_method":{"cash","card","jazzcash","easypaisa"},"expected_cash","counted_cash","difference"}`
- `GET /admin/pos/shifts/?from=&to=` + `GET /admin/pos/shifts/{id}/z-report/` for the Billing & Z-Report page history.
- POS orders carry `shift_id`; void/refund after close is only allowed for manager+ and appears on the next Z report.

### E.10 Priority
1. E.1 + E.2 (entitlement + enforcement) · 2. E.4 (invoices/proof) + E.7 · 3. E.8 shared settings · 4. E.9 shifts · 5. E.5, E.6, E.3.
