/**
 * logger.ts — Hệ thống ghi log có cấp độ duy nhất của dự án.
 *
 * QUY TẮC: Nghiêm cấm dùng `console.*` trực tiếp trong `src/`. Mọi module phải
 * dùng logger theo scope riêng để log có ngữ cảnh và tự động ẩn ở production.
 *
 *   const log = createLogger("api/students");
 *   log.debug("cache miss", { key });
 *   log.error("GET failed", { error, schoolId });
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

const isProduction = process.env.NODE_ENV === "production";

/** Các khóa nhạy cảm sẽ bị che khi serialize context. */
const SENSITIVE_KEY_PATTERN =
  /(password|pass|token|secret|api[_-]?key|authorization|cookie|credential)/i;

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY_PATTERN.test(key)) return "***";
  return normalizeValue(key, value);
}

function normalizeValue(key: string, value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(`${key}[${index}]`, item));
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      result[nestedKey] = redactValue(nestedKey, nestedValue);
    }
    return result;
  }

  return value;
}

function serializeContext(context?: LogContext): string {
  if (!context) return "";

  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    safe[key] = redactValue(key, value);
  }

  try {
    return ` ${JSON.stringify(safe)}`;
  } catch {
    return ' {"context":"<unserializable>"}';
  }
}

function write(level: LogLevel, scope: string, message: string, context?: LogContext): void {
  // debug/info: chỉ phục vụ phát triển, không ghi ở production.
  if (isProduction && (level === "debug" || level === "info")) return;

  const prefix = `[${level.toUpperCase()}][${scope}]`;
  const line = `${prefix} ${message}${serializeContext(context)}`;

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.info(line);
      break;
  }
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, context) => write("debug", scope, message, context),
    info: (message, context) => write("info", scope, message, context),
    warn: (message, context) => write("warn", scope, message, context),
    error: (message, context) => write("error", scope, message, context),
  };
}

export const logger = createLogger("app");
