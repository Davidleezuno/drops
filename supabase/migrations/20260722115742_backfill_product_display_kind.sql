-- Existing storefronts predate product-level merchandising. Give the two
-- obvious verticals a useful starting point; all other products keep the
-- neutral shelved fallback.
update public.products as products
set display_kind = case drops.theme ->> 'vertical'
  when 'fnb' then 'served'
  when 'fashion' then 'hung'
  else products.display_kind
end
from public.drops as drops
where drops.id = products.drop_id
  and products.display_kind = 'shelved'
  and drops.theme ->> 'vertical' in ('fnb', 'fashion');
