import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/", "/login", "/forgot-password", "/reset-password", "/auth/callback", "/dashboard/:path*", "/playground/:path*", "/sessions/:path*", "/settings/:path*", "/room/:path*"],
};
