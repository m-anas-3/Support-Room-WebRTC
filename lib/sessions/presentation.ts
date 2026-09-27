import { qualityLabel, sessionDurationSeconds, type SupportSession } from "./types";

export function shortSessionId(id: string) {
  return `SR-${id.slice(0, 8).toUpperCase()}`;
}

export function customerDisplayName(session: SupportSession) {
  return session.customer_name ?? (session.status === "created" ? "No customer joined" : "Customer");
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CU";
  return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : parts[0].slice(0, 2)).toUpperCase();
}

export function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

export function formatSessionDuration(session: SupportSession, referenceTime?: number) {
  return formatDuration(sessionDurationSeconds(session, referenceTime));
}

export function qualityTone(score: number | null) {
  if (score === null) return "border-slate-200 bg-slate-50 text-slate-600";
  if (score >= 90) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 75) return "border-blue-200 bg-blue-50 text-blue-700";
  if (score >= 55) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export function sessionQuality(session: SupportSession) {
  return qualityLabel(session.quality_score);
}

export function formatMetric(value: number | null, unit: string, decimals = 0) {
  return value === null ? "—" : `${value.toFixed(decimals)} ${unit}`;
}

export function formatBitrate(value: number | null) {
  if (value === null) return "—";
  return value >= 1000 ? `${(value / 1000).toFixed(1)} Mbps` : `${Math.round(value)} kbps`;
}
