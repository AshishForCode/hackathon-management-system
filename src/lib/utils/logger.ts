/**
 * Structured logger for the application.
 * In development: pretty-printed colored output.
 * In production: JSON lines for log aggregation.
 *
 * Uses console methods for compatibility with Vercel/serverless.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    // JSON output for log aggregation
    return JSON.stringify(entry);
  }

  // Pretty output for development
  const colorMap: Record<LogLevel, string> = {
    debug: "\x1b[36m", // cyan
    info: "\x1b[32m",  // green
    warn: "\x1b[33m",  // yellow
    error: "\x1b[31m", // red
  };
  const reset = "\x1b[0m";
  const color = colorMap[entry.level];
  const ctx = entry.context ? ` [${entry.context}]` : "";
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : "";

  return `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp}${ctx} ${entry.message}${dataStr}`;
}

function log(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown>,
  error?: Error
): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    data,
    error: error
      ? { name: error.name, message: error.message, stack: error.stack }
      : undefined,
  };

  const formatted = formatEntry(entry);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

/**
 * Create a logger instance with a fixed context (e.g., service name).
 *
 * @example
 * const logger = createLogger("HackathonService");
 * logger.info("Created hackathon", { id: hackathon.id });
 * logger.error("Failed to create", undefined, error);
 */
export function createLogger(context: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) =>
      log("debug", message, context, data),
    info: (message: string, data?: Record<string, unknown>) =>
      log("info", message, context, data),
    warn: (message: string, data?: Record<string, unknown>) =>
      log("warn", message, context, data),
    error: (message: string, data?: Record<string, unknown>, error?: Error) =>
      log("error", message, context, data, error),
  };
}

// Default logger (no context)
export const logger = {
  debug: (message: string, data?: Record<string, unknown>) =>
    log("debug", message, undefined, data),
  info: (message: string, data?: Record<string, unknown>) =>
    log("info", message, undefined, data),
  warn: (message: string, data?: Record<string, unknown>) =>
    log("warn", message, undefined, data),
  error: (message: string, data?: Record<string, unknown>, error?: Error) =>
    log("error", message, undefined, data, error),
};
