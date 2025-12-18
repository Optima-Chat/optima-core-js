import { AsyncLocalStorage } from 'async_hooks';

// src/config/build-info.ts
function getBuildInfo() {
  const gitCommit = process.env.GIT_COMMIT || "unknown";
  return {
    gitCommit,
    shortCommit: gitCommit.substring(0, 7),
    gitBranch: process.env.GIT_BRANCH || "unknown",
    buildDate: process.env.BUILD_DATE || (/* @__PURE__ */ new Date()).toISOString(),
    version: process.env.APP_VERSION || "0.0.0",
    environment: process.env.NODE_ENV || "development",
    deploymentId: process.env.DEPLOYMENT_ID || ""
  };
}
var cachedBuildInfo = null;
function getCachedBuildInfo() {
  if (!cachedBuildInfo) {
    cachedBuildInfo = getBuildInfo();
  }
  return cachedBuildInfo;
}
var asyncLocalStorage = new AsyncLocalStorage();
function getTraceContext() {
  return asyncLocalStorage.getStore() || {};
}

// src/logging/logger.ts
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function createLogger(options) {
  const {
    serviceName,
    format = process.env.LOG_FORMAT === "text" ? "text" : "json",
    level = process.env.LOG_LEVEL || "info"
  } = options;
  const minLevel = LOG_LEVELS[level];
  function shouldLog(logLevel) {
    return LOG_LEVELS[logLevel] >= minLevel;
  }
  function formatEntry(entry) {
    if (format === "text") {
      const parts = [
        entry.timestamp,
        `[${entry.level.toUpperCase()}]`,
        entry.service,
        "-",
        entry.message
      ];
      if (entry.traceId) {
        parts.push(`| trace_id=${entry.traceId}`);
      }
      if (entry.exception) {
        parts.push(`
${entry.exception.stack || entry.exception.message}`);
      }
      return parts.join(" ");
    }
    return JSON.stringify(entry);
  }
  function log(logLevel, message, extra, error) {
    if (!shouldLog(logLevel)) {
      return;
    }
    const buildInfo = getCachedBuildInfo();
    const traceContext = getTraceContext();
    const entry = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level: logLevel,
      service: serviceName,
      version: buildInfo.version,
      gitCommit: buildInfo.shortCommit,
      environment: buildInfo.environment,
      message
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
        stack: error.stack
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
    debug: (message, extra) => log("debug", message, extra),
    info: (message, extra) => log("info", message, extra),
    warn: (message, extra) => log("warn", message, extra),
    error: (message, extra, error) => log("error", message, extra, error),
    exception: (message, error, extra) => log("error", message, extra, error)
  };
}
var defaultLogger = null;
function configureLogger(options) {
  defaultLogger = createLogger(options);
}
function getLogger() {
  if (!defaultLogger) {
    return {
      debug: () => {
      },
      info: () => {
      },
      warn: () => {
      },
      error: () => {
      },
      exception: () => {
      }
    };
  }
  return defaultLogger;
}

export { configureLogger, createLogger, getLogger };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map