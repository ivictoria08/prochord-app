import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { supabaseConfig } from './lib/supabase/config';

export async function proxy(request) {
  const { url, key } = supabaseConfig();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies, headers) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers || {}).forEach(([name, value]) => response.headers.set(name, value));
      }
    }
  });
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = !error && !!data?.claims?.sub;
  const isLogin = request.nextUrl.pathname === '/admin/login';
  let admin = false;
  if (signedIn) {
    const result = await supabase.rpc('es_administrador');
    admin = !result.error && result.data === true;
  }
  const destination = !admin && !isLogin ? '/admin/login' : admin && isLogin ? '/admin/dashboard' : null;
  if (destination) {
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const name of ['expires', 'pragma']) {
      const value = response.headers.get(name);
      if (value) redirect.headers.set(name, value);
    }
    redirect.headers.set('Cache-Control', 'private, no-store');
    return redirect;
  }
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config = { matcher: ['/admin/:path*'] };
