import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { getSupportSessions } from "@/lib/sessions/server";

export default async function DashboardPage() {
  const result = await getSupportSessions();
  return <AgentDashboard sessions={result.sessions} historyError={result.error} referenceTime={new Date().toISOString()} />;
}
