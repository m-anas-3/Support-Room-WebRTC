export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new Error("Supabase authentication is not configured.");
  }
  return { url, publishableKey };
}

export function getSiteUrl() {
  const configured = process.env.SUPPORTROOM_SITE_URL?.trim();
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const value = configured || (vercelUrl ? `https://${vercelUrl}` : process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  if (!value) throw new Error("SUPPORTROOM_SITE_URL is not configured.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("SUPPORTROOM_SITE_URL must use HTTP or HTTPS.");
  return url.origin;
}
