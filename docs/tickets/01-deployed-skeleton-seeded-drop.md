# 01 — Deployed skeleton serving a seeded drop

**What to build:** A visitor opens the production URL for a drop (`/{seller}/{drop}`) on their phone and sees a real storefront read from the database: seller name, products with prices and variants, stock remaining (static for now), fulfilment details, and a countdown to the drop window's end. The drop exists because we seeded it — there is no builder yet. The app is deployed to Vercel from day one (the HitPay webhook registration in the next ticket needs a public HTTPS URL, so deploy-first is deliberate, not polish).

Includes standing up the Supabase project with the full schema from the tech spec (drops, products, orders, webhook_events, RLS: anon may read drops/products only) and a seed script for one demo drop with 2–3 products.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Production Vercel URL renders the seeded drop on a phone: products, prices, stock, countdown — https://drops-gold.vercel.app/rotiwife/tonight
- [x] Data comes from Supabase Postgres, not hardcoded constants
- [x] Full schema applied, including RLS (anon can read drops/products; orders and webhook_events are server-only) — `supabase/migrations/0001_init.sql`
- [x] Seed script creates a fresh demo drop in one command — `npm run seed`
- [x] An ended drop (window in the past) renders as "Drop ended" instead of the product list
