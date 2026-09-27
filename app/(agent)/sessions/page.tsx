import { SessionHistory } from "@/components/sessions/session-history";
import { getSupportSessions } from "@/lib/sessions/server";

export default async function SessionsPage() {
  const result = await getSupportSessions();
  return <SessionHistory sessions={result.sessions} error={result.error} referenceTime={new Date().toISOString()} />;
}
