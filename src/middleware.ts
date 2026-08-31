import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie and redirects signed-out visitors away
 * from /admin.
 *
 * This is a REDIRECT, not the security boundary. The real enforcement is
 * row-level security in the database: even with a forged cookie, every admin
 * query runs as an anonymous user and returns nothing. Middleware just makes
 * the failure a clean login screen instead of an empty page.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Without Supabase configured there is no admin to protect. The public site
  // still builds and serves from file content.
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must be getUser(), not getSession(): getSession trusts the cookie without
  // verifying it against the auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname.startsWith("/admin/login");
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin && !isLogin && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/admin/login";
    // Send them back where they were headed once they sign in.
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  if (isLogin && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/admin";
    redirect.search = "";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
