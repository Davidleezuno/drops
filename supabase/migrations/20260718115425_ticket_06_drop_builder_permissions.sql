-- Ticket 06: the server-only builder creates drops and their products.
-- RLS remains enabled; only the service role receives write privileges.

grant insert, delete on table public.drops to service_role;
grant insert on table public.products to service_role;
