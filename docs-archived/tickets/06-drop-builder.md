# 06 — Drop builder: photo → live link in 60 seconds

**What to build:** A seller on their phone uploads the menu/product photo they already send customers. AI extraction (via Vercel AI Gateway, model configured by env var — `openai/gpt-5.6-terra` by default, with a fallback model for demo-night resilience) returns products, variants, and prices into **one editable review form** — not a chat. Below the extracted rows sit the only three blocking inputs: stock per item, window end, fulfilment (pickup / delivery + fee). Publish creates the drop and shows two links: the public buyer page with a QR code, and the secret console link marked "keep this private". Total time from upload to shareable link: under 60 seconds.

Extraction mistakes are a feature, not a failure: the seller fixes them inline in the form ("AI drafts, you confirm"). The model never creates the drop directly — publish submits the human-confirmed form.

**Blocked by:** 01 — Deployed skeleton serving a seeded drop. (Runs in parallel with 02–05; it only needs the schema and deploy, not the money loop.)

**Status:** done

- [x] Photo of a real menu → extracted products/prices editable in the review form, ~3 s
- [x] Exactly three blocking inputs beyond the extracted rows: stock, window, fulfilment
- [x] Publish → live buyer URL + QR + secret console URL; buyer link renders immediately
- [x] Extraction model swappable via env var without code change; fallback model kicks in if primary errors
- [x] Full run on a phone, upload to shareable link, in under 60 seconds
