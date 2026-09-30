export type LogFields = Record<string, string | number | boolean | null | undefined>;

export type Logger = {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
};

export function createLogger(service = "support-room-signaling", revision?: string): Logger {
  const write = (level: "info" | "warn" | "error", event: string, fields: LogFields = {}) => {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service,
      event,
      ...(revision ? { revision } : {}),
      ...fields,
    });
    if (level === "error") console.error(entry);
    else if (level === "warn") console.warn(entry);
    else console.log(entry);
  };
  return {
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields),
  };
}
