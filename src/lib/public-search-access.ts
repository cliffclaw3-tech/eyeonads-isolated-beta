type SearchUser = { id: string; app_metadata?: Record<string, unknown> };

// Call only after the authoritative broker-role check. Fresh brokers in the
// named isolated beta do not need an administrator to edit auth metadata.
export function canUsePublicSearch(user: SearchUser, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!user.id) return false;
  if (user.app_metadata?.eyeonads_pilot === true) return true;
  return env.VERCEL_ENV === 'preview'
    && env.BETA_BUDDY_ENV === 'beta'
    && env.BETA_BUDDY_ISOLATED_DATA === '1'
    && env.NEXT_PUBLIC_SUPABASE_URL === 'https://whmxiocdtulylddebjpm.supabase.co'
    && env.BETA_BUDDY_APP_ORIGIN === 'https://eyeonads-isolated-beta.vercel.app';
}
