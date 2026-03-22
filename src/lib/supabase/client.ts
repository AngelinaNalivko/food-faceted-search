import { createClient } from '@supabase/supabase-js'

// export a client-side supabase client for Next.js

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)