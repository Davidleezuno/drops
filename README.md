# Drops

Drops is a short-lived storefront for creators and small sellers. Upload product photos, let AI draft the catalogue, publish one shareable link, take sandbox payments through HitPay, and watch paid stock update through Supabase Realtime.

The app is a Next.js 16 project using React 19, Supabase, the Vercel AI SDK, and HitPay's sandbox API.

## Run it locally

You need Node.js 20+, pnpm 10, a Supabase project, a Vercel AI Gateway key, and a HitPay sandbox account.

```bash
git clone https://github.com/Davidleezuno/drops.git
cd drops
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`, then link your Supabase project and apply the committed migrations:

```bash
pnpm dlx supabase@2.109.1 link --project-ref YOUR_PROJECT_REF
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The seller flow starts at `/new`; `/why` contains the project story.

For payments, create sandbox API credentials in HitPay and register this webhook endpoint:

```text
https://YOUR_PUBLIC_HOST/api/hitpay/webhook
```

HitPay must be able to reach the endpoint, so local webhook testing needs a public HTTPS tunnel. This repository always targets HitPay's sandbox API.

## Environment

Copy `.env.example` and provide these values:

- `NEXT_PUBLIC_APP_URL`: the app's public origin; use `http://localhost:3000` locally.
- `NEXT_PUBLIC_SUPABASE_URL`: your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the browser-safe Supabase key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service-role key.
- `AI_GATEWAY_API_KEY`: used for image-to-catalogue generation.
- `HITPAY_API_KEY`: HitPay sandbox business API key.
- `HITPAY_WEBHOOK_SALT`: salt for the registered sandbox webhook.

Model and seed overrides in `.env.example` are optional.

## Useful commands

```bash
pnpm dev             # start Next.js locally
pnpm build           # production build
pnpm lint            # ESLint
pnpm test            # Vitest suite
pnpm db:generate     # create a Supabase migration
pnpm db:migrate      # push migrations to the linked Supabase project
pnpm seed            # seed the demo drops and product images
pnpm agent:smoke fixtures/seed/food-set-1.jpeg  # run one live image extraction
```

## Repository map

- `app/`: pages and API routes.
- `components/`: storefront, landing, world, and UI components.
- `lib/`: domain logic and Supabase, HitPay, realtime, and AI integrations.
- `fixtures/seed/`: public images required by `pnpm seed`.
- `supabase/migrations/`: database schema and RPC migrations.
- `scripts/`: seed, smoke, and race-proofing utilities.
- `.agents/skills/hitpay/`: local HitPay implementation guidance for coding agents.

## Notes for coding agents

Read `AGENTS.md` before making changes. It records the package manager, sandbox-only payment constraint, migration workflow, verification expectations, and the files that define each integration. The checked-in HitPay skill provides additional API and webhook details.
