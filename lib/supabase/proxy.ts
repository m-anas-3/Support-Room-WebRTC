import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

const protectedPrefixes = ["/dashboard", "/playground", "/sessions", "/settings", "/room"];

function isProtectedPath(pathname: string) {
  return pathname === "/" || protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function copySessionResponse(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
  return target;
}

export async function updateSession(request: NextRequest) {
  if (process.env.SUPPORTROOM_E2E === "1") return NextResponse.next({ request });

  const pathname = request.nextUrl.pathname;
  if (!isSupabaseConfigured()) {
    if (!isProtectedPath(pathname)) return NextResponse.next({ request });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("configuration", "missing");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const authenticated = Boolean(data?.claims?.sub);

  if (pathname === "/login" && authenticated) {
    return copySessionResponse(response, NextResponse.redirect(new URL("/dashboard", request.url)));
  }
  if (isProtectedPath(pathname) && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return copySessionResponse(response, NextResponse.redirect(loginUrl));
  }
  return response;
}
