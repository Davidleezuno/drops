-- Keep the AI's product-level merchandising decision, while deterministic
-- room code remains responsible for safe geometry and balanced circulation.
alter table public.products
  add column display_kind text not null default 'shelved'
  check (display_kind in ('served', 'hung', 'shelved', 'stacked', 'framed', 'tabletop'));
