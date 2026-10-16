import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Email token hashes can be verified in the receiving browser; unlike a PKCE
// authorization code they do not require cookies from the signup browser.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (hash && /^[A-Za-z0-9_-]{20,256}$/.test(hash) && type === 'email') {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({ token_hash: hash, type: 'email' });
    if (!error) return NextResponse.redirect(new URL('/dashboard', url.origin), {
      headers: { 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer' },
    });
  }
  return NextResponse.redirect(new URL('/login?message=Verification+link+is+invalid+or+expired.+Request+a+new+sign-in+link.', url.origin), {
    headers: { 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer' },
  });
}
