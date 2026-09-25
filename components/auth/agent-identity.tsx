"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AgentIdentity = {
  id: string;
  name: string;
  email: string;
  initials: string;
};

const fallbackAgent: AgentIdentity = {
  id: "development-agent",
  name: "Support agent",
  email: "agent@supportroom.dev",
  initials: "SA",
};

const AgentIdentityContext = createContext(fallbackAgent);

export function AgentIdentityProvider({ value, children }: { value: AgentIdentity; children: ReactNode }) {
  return <AgentIdentityContext.Provider value={value}>{children}</AgentIdentityContext.Provider>;
}

export function useAgentIdentity() {
  return useContext(AgentIdentityContext);
}
