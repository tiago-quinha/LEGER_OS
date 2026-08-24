import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    cookieOptions: {
      name: 'sb-auth-token',
      maxAge: 60 * 60 * 24 * 365,
      domain: '',
      sameSite: 'lax',
      path: '/',
    }
  }
)
