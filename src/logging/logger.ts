/**
 * 结构化日志模块
 */

import { getCachedBuildInfo } from "../config/build-info";
import { getTraceContext } from "../tracing/context";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  version: string;
  gitCommit: string;
  environment: string;
  deploymentId?: string;
  traceId?: string;
  requestId?: string;
  parentSpanId?: string;
  message: string;
  extra?: Record<string, unknown>;
  exception?: {
    type: string;
    message: string;
    stack?: string;
  };
}

export interface LoggerOptions {
  serviceName: string;
  format?: "json" | "text";
  level?: LogLevel;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * 创建结构化日志器
 */
export function createLogger(options: LoggerOptions) {
  const {
    serviceName,
    format = process.env.LOG_FORMAT === "text" ? "text" : "json",
    level = (process.env.LOG_LEVEL as LogLevel) || "info",
  } = options;

  const minLevel = LOG_LEVELS[level];

  function shouldLog(logLevel: LogLevel): boolean {
    return LOG_LEVELS[logLevel] >= minLevel;
  }

  function formatEntry(entry: LogEntry): string {
    if (format === "text") {
      const parts = [
        entry.timestamp,
        `[${entry.level.toUpperCase()}]`,
        entry.service,
        "-",
        entry.message,
      ];

      if (entry.traceId) {
        parts.push(`| trace_id=${entry.traceId}`);
      }

      if (entry.exception) {
        parts.push(`\n${entry.exception.stack || entry.exception.message}`);
      }

      return parts.join(" ");
    }

    return JSON.stringify(entry);
  }

  function log(
    logLevel: LogLevel,
    message: string,
    extra?: Record<string, unknown>,
    error?: Error
  ): void {
    if (!shouldLog(logLevel)) {
      return;
    }

    const buildInfo = getCachedBuildInfo();
    const traceContext = getTraceContext();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: logLevel,
      service: serviceName,
      version: buildInfo.version,
      gitCommit: buildInfo.shortCommit,
      environment: buildInfo.environment,
      message,
    };

    if (buildInfo.deploymentId) {
      entry.deploymentId = buildInfo.deploymentId;
    }

    if (traceContext.traceId) {
      entry.traceId = traceContext.traceId;
    }

    if (traceContext.requestId) {
      entry.requestId = traceContext.requestId;
    }

    if (traceContext.parentSpanId) {
      entry.parentSpanId = traceContext.parentSpanId;
    }

    if (extra && Object.keys(extra).length > 0) {
      entry.extra = extra;
    }

    if (error) {
      entry.exception = {
        type: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    const output = formatEntry(entry);

    switch (logLevel) {
      case "debug":
        console.debug(output);
        break;
      case "info":
        console.info(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "error":
        console.error(output);
        break;
    }
  }

  return {
    debug: (message: string, extra?: Record<string, unknown>) =>
      log("debug", message, extra),

    info: (message: string, extra?: Record<string, unknown>) =>
      log("info", message, extra),

    warn: (message: string, extra?: Record<string, unknown>) =>
      log("warn", message, extra),

    error: (message: string, extra?: Record<string, unknown>, error?: Error) =>
      log("error", message, extra, error),

    exception: (message: string, error: Error, extra?: Record<string, unknown>) =>
      log("error", message, extra, error),
  };
}

// 默认 logger（需要先配置）
let defaultLogger: ReturnType<typeof createLogger> | null = null;

/**
 * 配置默认 logger
 */
export function configureLogger(options: LoggerOptions): void {
  defaultLogger = createLogger(options);
}

/**
 * 获取默认 logger
 */
export function getLogger(): ReturnType<typeof createLogger> {
  if (!defaultLogger) {
    // 返回一个空操作的 logger
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      exception: () => {},
    };
  }
  return defaultLogger;
}
