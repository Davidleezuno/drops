import { createClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client (service role) — bypasses RLS.
 * Never import this from client components.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
