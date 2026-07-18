Drops — Background & Context Synthesis

Companion to drops-product-overview.md. This documents the reasoning behind what we're building, so feature and spec decisions stay anchored to the original insight.


1. Origin: a real transaction

This started with a first-hand purchase from a WhatsApp-based seller (pani puri, $48): ten messages to establish what was available, negotiate delivery to Hougang, hand-calculate $35 + $13, then pay by PayLah and send a screenshot the seller manually verified. Every order this seller takes repeats that loop. The three structural problems:


No digital storefront — the catalogue is an image forwarded in chat.
Manual order confirmation — items, address, timing, and totals negotiated message by message.
Manual reconciliation — payment screenshots matched to orders by hand.


This isn't an edge case. It's the default operating model for a large slice of HitPay's core customer base.

2. Why this seller is HitPay's ICP

HitPay's sweet spot is Southeast Asian SMBs — typically under 100 employees, founder-led, operationally lean — that need multi-channel payments without a payments team. Its brand was built on the micro tier: Instagram sellers, home businesses, market stalls, freelancers — served with payment links, QR codes, and zero-config onboarding. The conversational seller sits exactly there: digitally enabled, no developer, currently using PayNow/screenshots as their payment stack. Building for them is building for HitPay's center of gravity, which matters at a HitPay-judged event.

3. The macro thesis: distribution has shifted from corporations to individuals

Commerce discovery increasingly flows through people — influencers, creators, live sellers, thought leaders, paid partnerships — not brand domains. But commerce infrastructure still assumes the corporation: permanent catalogues, SKU databases, themes, config panels. It anchors on the store and expects traffic to come to it.

When the anchor is a person with a following, inventory is fluid (tonight's bake, this week's import run, the collab piece, whatever's on stream right now) and demand arrives in bursts tied to attention. The right primitive is not a store but a drop: limited stock, a time window, one link, self-expiring. That reframe — static stores → dynamic drops — is the product thesis. A drop is a different object from a store: stock races to zero, buyers claim before they pay, the window closes, and settlement must reconcile itself because the seller is one person.

Singapore live commerce is estimated at up to US$1.3B (2025, DBS), so this is a meaningful vertical, not a niche workflow.

4. The path here: ideas considered and why they lost

We iterated through several concepts. The rejections carry as much information as the winner.

AI storefront builder (upload images → AI builds a store). Rejected as the core: "AI builds a website" is a crowded demo pattern (v0, Lovable), HitPay already has a store builder so it reads as a thin wrapper, and it solves only problem 1 — the recurring per-order work (confirmation, reconciliation) remains manual. AI generation survives as the setup layer, not the product.

WhatsApp order copilot / chat-to-cart (paste chats → AI structures orders → send payment links). Rejected because the merchant still shuttles messages and links manually — it relocates the work rather than removing it. The correct move is letting the customer provide structured input directly via a link.

Buyer-facing livestream storefront competing on in-stream checkout. Rejected: TikTok Shop owns native live shopping (pinned products, flash sales, in-stream checkout) and aggressively locks sellers in. Competing on TikTok's own surface against a first-party integration is unwinnable. The white space is off-platform: sellers whose audiences span WhatsApp, Instagram, Facebook, Telegram, and offline — where TikTok's machinery doesn't reach and sellers keep the customer and payment relationship.

Simple photo-to-checkout order link. Strong and demoable, but its proposed differentiator (natural-language delivery-rules config) is a garnish, and the concept lacks a memorable demo climax and a defensible thesis.

Ephemeral drops won because it keeps everything that worked (AI setup from an existing image, one shareable link, HitPay webhook reconciliation) and adds the parts that are hard, HitPay-native, and thesis-aligned: claim-to-pay with TTL reservations, live scarcity, drop expiry, and automatic settlement. It also extends naturally to live sellers — a live session is a drop — without building livestream infrastructure now.

5. What the product actually is

One sentence: anyone with a following can spin up a live, self-expiring storefront in under a minute, and the drop runs itself — claims, payments, stock, and reconciliation.

The division of labour is deliberate:


AI works before the transaction — extract products from the image the seller already uses, ask only checkout-blocking questions, generate the drop. Setup in ~60 seconds is the acquisition hook.
Deterministic state machine during — claims, TTL reservations, stock, payment state. The model never decides whether a payment succeeded or how many units remain; the database and validated webhooks do.
HitPay after — payment requests carrying order references, webhook-confirmed paid state, refunds. HitPay is the reconciliation mechanism, not a bolt-on.


6. Feasibility (verified against HitPay docs, July 2026)

The full demo loop runs on real HitPay sandbox: free instant signup (dummy details, email verification only), POST /v1/payment-requests with reference_number for order matching, dashboard-registered webhooks (payment_request.completed, HMAC-SHA256 with salt) that fire in sandbox, and rate limits (70 payment creations/min) that comfortably cover an audience demo. Sandbox supports PayNow, cards, GrabPay, ShopeePay, Atome (enable in Settings → Payment Methods).

Known constraints to design around:


Audience payment on own phone: sandbox PayNow simulates via camera scan of the QR — impossible on one's own screen. Default audience path is test card 4242 4242 4242 4242; PayNow beat is scripted with two phones (or pair-up neighbors).
Webhook needs public HTTPS — Supabase Edge Function (public URL) + Supabase Realtime for live fan-out to buyer phones and the projector. No ngrok dependency on venue wifi.
Redirect URL is untrusted (docs explicit) — paid state from webhook only, with GET /v1/payment-requests/{id} polling as sanctioned fallback.
Bonus points: the event rewards using HitPay AI Builder tools (Claude Code plugin, AI skills, CLI) — use them in the build and say so.


7. Judging criteria mapping


Technicality: concurrent claim-to-pay races, TTL reservations, idempotent webhook-driven state, realtime fan-out — a state machine, not a form.
Problem–solution impact: kills all three origin problems at the seller's highest-stakes moment (limited stock, many buyers, minutes to convert); value is quantifiable — 10 messages → 1 link, screenshot-matching → zero.
Creativity: the store→drop thesis gives judges an argument, not just a feature; the audience-participation demo (QR on projector, room races to buy, stock ticks to SOLD OUT live) proves the concurrency instead of claiming it.


8. Guardrails for spec'ing

When fleshing out features, hold these lines:


The drop object is the product. Any feature that pulls toward "permanent store" (themes, catalogues, SEO, accounts) is off-thesis.
AI accelerates setup and handles ambiguity; money and stock stay deterministic.
One golden path for the hackathon: one merchant, one drop, one delivery model, real sandbox payments. WhatsApp API, TikTok integration, livestream video, CRM, multi-merchant are roadmap.
The demo is the spec's forcing function: every P0 feature must appear in the 3-minute arc (upload → live in 60s → audience race → sold out → reconciled orders + packing list).
Roadmap direction is live-session mode (spotlight, flash pricing, session carts, post-live reconciliation), then collab drops with split settlement — "point any livestream at a drop link" is the expansion story.