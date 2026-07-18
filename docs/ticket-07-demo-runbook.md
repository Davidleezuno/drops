# Ticket 07 — Demo Runbook

Use this as the single checklist for proving the race, rehearsing the room, and recording the three-minute submission. The automated race and the human dry run prove different things; do both.

## 1. Automated race proof

Run against the deployed app with the sandbox credentials in `.env.local`:

```bash
pnpm race:proof
```

The script creates an isolated low-stock drop, starts 12 real HitPay sandbox payment requests through the deployed `/api/buy` route, and delivers 12 correctly signed completion events to the deployed webhook concurrently. It then proves:

- exactly 4 orders become `PAID`;
- the other 8 become `PAID_LATE`;
- `stock_sold` finishes at 4 and never exceeds `stock_total`;
- a bad signature returns 401;
- replaying a completion returns `duplicate` and does not change stock.

The sandbox payment requests and database fixture are removed at the end. Override the shape with `--buyers` and `--stock`; buyers must be greater than stock and no more than 50:

```bash
pnpm race:proof -- --buyers 20 --stock 6
```

Pass `--keep` only when you want to inspect the isolated storefront and console afterward. The script prints both URLs.

This proof uses real sandbox-created payment requests with simulated signed completions so it can be deterministic and concurrent. It does not replace the human checkout rehearsal below, which proves the hosted card and PayNow screens plus HitPay-originated webhooks.

## 2. Payment-method preflight

The deployed app defaults to PayNow because that provider is already configured. For the audience card path:

1. In the HitPay sandbox dashboard, enable Cards under Settings → Payment Methods.
2. Set `HITPAY_PAYMENT_METHODS=paynow_online,card` in the Vercel project.
3. Redeploy and start one checkout. Confirm the hosted page offers both methods.
4. Pay by card with `4242 4242 4242 4242`, any future expiry, and any three-digit CVC.
5. Confirm the order page reaches `PAID`, the counter drops, and the console row flips to `PAID`.

For the PayNow beat, open checkout on phone A and scan its sandbox QR with the normal camera on phone B. The sandbox scan simulates a successful payment; do not try to scan a QR displayed on the same phone.

Official references: [HitPay sandbox testing](https://docs.hitpayapp.com/apis/guide/sandbox) and [online-payment webhook flow](https://docs.hitpayapp.com/apis/guide/online-payments).

## 3. Day-of preflight

Do this on the venue network and again on mobile data:

- Run `pnpm race:proof` once. Save the PASS output in the build log or recording.
- Create a fresh drop through `/new`; use one product with total stock equal to the number of intended successful buyers.
- Open the buyer URL on the projector and use **Project QR** on the builder success screen while people join.
- Open the secret console in a separate operator window. Never project its token-bearing URL.
- Complete one card payment and one two-phone PayNow payment before inviting the room.
- Confirm a second buyer tab changes within one second; leave it open as the projector view.
- Keep the HitPay sandbox dashboard open on the operator laptop for refunds and webhook/request logs.
- Keep the buyer URL, console URL, and a second freshly seeded fallback drop in a private note.

Audience instruction to put on screen or say verbatim:

> Scan the QR, choose one item, and pay in the HitPay sandbox. For card use 4242 4242 4242 4242, any future expiry, and any three digits. No real money moves.

## 4. Ten-phone rehearsal

Record the result, not just whether the page loaded.

| Check | Pass condition | Result |
|---|---|---|
| Join | At least 10 phones open the same buyer URL from the projected QR | |
| Payment | Every participant reaches hosted HitPay checkout | |
| Fan-out | Projector counter changes within 1 second of a completed payment | |
| Last unit | Two phones pay for the final unit; exactly one reaches `PAID` | |
| Late payer | The other reaches the honest sold-out/refund message | |
| Poster | Projector flips to the full SOLD OUT composition | |
| Console | `PAID_LATE` is pinned above normal orders with the refund instruction | |
| Settlement | Packing quantity equals paid quantity; paid-late orders are excluded | |
| Copy | Packing and fulfilment lists paste cleanly into a plain-text note | |
| PayNow | Phone A displays the QR; phone B camera scan completes the sandbox payment | |

If Realtime stalls, wait five seconds before intervening: the storefront has a polling backstop. If checkout creation returns busy, pause new buyers briefly rather than refreshing completed checkouts.

## 5. Three-minute video

Keep one continuous story. Show the working product more than the slides.

| Time | Beat | What must be visible |
|---|---|---|
| 0:00–0:25 | Pain | The real 10-message order and manual payment screenshot; “Now imagine 50 buyers.” |
| 0:25–0:55 | Spin up | Upload the menu, show editable AI extraction, set stock/window/fulfilment, publish. |
| 0:55–1:10 | Share | Large projected QR and the one-link explanation. |
| 1:10–2:15 | Race | Multiple checkouts, real HitPay sandbox UI, live counter ticks, final-unit race, SOLD OUT. |
| 2:15–2:40 | Settle | Console order feed, `PAID_LATE` refund flag, exact packing and fulfilment lists. |
| 2:40–3:00 | Thesis | “Ten messages became one link. Storefronts were built for corporations; Drops is built around a person.” |

Show the build tooling for a few seconds during the spin-up or technicality beat: the HitPay integration skill used for the checkout/webhook path and the race-proof terminal output. Mention that payment success comes only from validated HitPay webhooks and the guarded database write prevents overselling.

Before submitting, verify the file is at most three minutes and email it to `demonight@hit-pay.com` before Monday, 20 July 2026 at 23:59 SGT.
