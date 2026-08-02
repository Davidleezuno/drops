# Agent guide

## Goal

Drops is a focused, hackathon-sized product. Protect the core flow: seller image to draft, published storefront, HitPay checkout, webhook-confirmed payment, realtime stock, and seller reconciliation. Prefer a small complete change over broad infrastructure or speculative features.

## Setup

1. Use pnpm. Do not create or update `package-lock.json`.
2. Run `pnpm install`, copy `.env.example` to `.env.local`, and fill in local credentials.
3. Use a separate Supabase project and HitPay sandbox credentials. Never use production payment credentials for development or automated verification.
4. Link Supabase with `pnpm dlx supabase@2.109.1 link --project-ref YOUR_PROJECT_REF`, then run `pnpm db:migrate`.
5. Start the app with `pnpm dev`.

## Where to look

- `app/api/draft/route.ts` and `lib/agents/`: image-to-catalogue generation.
- `app/api/drops/route.ts` and `lib/drop-builder.ts`: publishing a drop.
- `app/api/buy/route.ts`, `lib/checkout.ts`, and `lib/hitpay.ts`: checkout creation and status.
- `app/api/hitpay/webhook/route.ts` and `lib/verify.ts`: payment confirmation and webhook verification.
- `lib/db.ts` and `supabase/migrations/`: server-side data access and schema.
- `fixtures/seed/` and `scripts/seed.mjs`: reproducible local demo data.
- `.agents/skills/hitpay/`: project-local HitPay sandbox guidance.

## Working rules

- Use HitPay sandbox only.
- Keep service-role, HitPay, AI, and webhook secrets server-side and in `.env.local`; never commit them or expose them through `NEXT_PUBLIC_*` variables.
- Generate migrations with `pnpm db:generate` and apply them with `pnpm db:migrate`. Do not edit a database manually without capturing the change in a migration.
- Payment state must come from a validated webhook or a server-to-server HitPay status check. Never trust the browser redirect as proof of payment.
- Preserve guarded, idempotent stock updates. AI may draft catalogue content but must never decide payment or inventory state.
- Add tests only where they materially protect money, stock, validation, or a reproduced regression. For ordinary UI work, lint and a focused manual check are enough.
- Before handing off a code change, run `pnpm lint` and `pnpm build` when the required local environment is available. Explain any verification you could not run.
