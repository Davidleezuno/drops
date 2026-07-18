# 03 — Live scarcity: the counter ticks on every phone

**What to build:** Two phones have the same drop page open. One buys and pays; within a second, the *other* phone's stock counter ticks down without a refresh. When the last unit sells, every open page flips to SOLD OUT and Buy disables. When the window closes, the page flips to "Drop ended". This is the demo's sold-out moment — the projector is just another subscriber.

Realtime comes from subscribing to product updates for the drop (the webhook's stock write is the event source). Include the backstop from the tech spec's failure-mode table: refetch on window focus plus a slow polling interval, so a Realtime hiccup on venue wifi degrades to "slightly delayed" rather than "frozen".

**Blocked by:** 02 — Money round-trip.

**Status:** ready-for-agent

- [ ] A paid order updates the counter on a second device in under 1 second, no refresh
- [ ] Counter shows stock_total − stock_sold; SOLD OUT state disables Buy on all open pages
- [ ] Window close flips open pages to "Drop ended" and disables Buy without a redeploy or cron
- [ ] Counter recovers via focus-refetch/interval backstop if the realtime connection drops
- [ ] Verified with 3+ simultaneous devices/tabs on the deployed URL
