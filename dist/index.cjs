'use strict';

var async_hooks = require('async_hooks');

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

// src/diagnostics/health.ts
var startTime = Date.now();
async function runHealthChecks(serviceName, checks = {}) {
  const buildInfo = getCachedBuildInfo();
  const checkResults = {};
  let overallHealthy = true;
  for (const [name, checkFn] of Object.entries(checks)) {
    const start = Date.now();
    try {
      const result = await checkFn();
      checkResults[name] = {
        ...result,
        latencyMs: Date.now() - start
      };
      if (result.status === "unhealthy") {
        overallHealthy = false;
      }
    } catch (error) {
      overallHealthy = false;
      checkResults[name] = {
        status: "unhealthy",
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  return {
    status: overallHealthy ? "healthy" : "unhealthy",
    service: serviceName,
    version: buildInfo.version,
    gitCommit: buildInfo.shortCommit,
    gitBranch: buildInfo.gitBranch,
    environment: buildInfo.environment,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1e3),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    checks: checkResults
  };
}
function createHealthHandler(options) {
  return async function GET() {
    const result = await runHealthChecks(
      options.serviceName,
      options.checks || {}
    );
    return Response.json(result, {
      status: result.status === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store"
      }
    });
  };
}

// src/diagnostics/endpoints.ts
var startTime2 = Date.now();
function getDebugInfo() {
  const buildInfo = getCachedBuildInfo();
  return {
    build: {
      gitCommit: buildInfo.gitCommit,
      gitBranch: buildInfo.gitBranch,
      buildDate: buildInfo.buildDate,
      version: buildInfo.version
    },
    runtime: {
      nodeVersion: process.version,
      environment: buildInfo.environment,
      debugMode: process.env.DEBUG === "true",
      logLevel: process.env.LOG_LEVEL || "info"
    },
    startupTime: new Date(startTime2).toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime2) / 1e3)
  };
}
var SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /password/i,
  /token/i,
  /credential/i,
  /private/i,
  /auth/i
];
function maskValue(key, value) {
  const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
  if (isSensitive) {
    return `** (${value.length} chars)`;
  }
  if (value.includes("://") && value.includes("@")) {
    return value.replace(/:([^@/]+)@/, ":***@");
  }
  return value;
}
function getDebugConfig(allowedPrefixes = ["DATABASE", "REDIS", "OAUTH", "CORS", "API"]) {
  const config = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    const matchesPrefix = allowedPrefixes.some(
      (prefix) => key.startsWith(prefix)
    );
    if (matchesPrefix) {
      config[key] = maskValue(key, value);
    }
  }
  return {
    config,
    infisicalEnabled: !!process.env.INFISICAL_CLIENT_ID,
    configSource: process.env.INFISICAL_CLIENT_ID ? "infisical" : "env"
  };
}
function validateDebugKey(request) {
  const debugKey = process.env.DEBUG_KEY;
  if (!debugKey) {
    return false;
  }
  const providedKey = request.headers.get("X-Debug-Key");
  return providedKey === debugKey;
}
function createDebugInfoHandler(options) {
  return async function GET(request) {
    if (options?.requireKey && !validateDebugKey(request)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json(getDebugInfo(), {
      headers: { "Cache-Control": "no-store" }
    });
  };
}
function createDebugConfigHandler(options) {
  return async function GET(request) {
    if (!validateDebugKey(request)) {
      return Response.json(
        { error: "Unauthorized - X-Debug-Key required" },
        { status: 401 }
      );
    }
    return Response.json(getDebugConfig(options?.allowedPrefixes), {
      headers: { "Cache-Control": "no-store" }
    });
  };
}
var asyncLocalStorage = new async_hooks.AsyncLocalStorage();
function getTraceContext() {
  return asyncLocalStorage.getStore() || {};
}
function getTraceId() {
  return getTraceContext().traceId;
}
function getRequestId() {
  return getTraceContext().requestId;
}
function getParentSpanId() {
  return getTraceContext().parentSpanId;
}
function runWithTraceContext(context, fn) {
  return asyncLocalStorage.run(context, fn);
}
function parseTraceContextFromHeaders(headers) {
  return {
    traceId: headers.get("X-Trace-ID") || void 0,
    parentSpanId: headers.get("X-Parent-Span-ID") || void 0
    // requestId 每个服务自己生成，不从 header 读取
  };
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

// src/tracing/ids.ts
function randomHex(length) {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, length);
}
function generateTraceId(serviceShort = "svc") {
  const timestamp = Math.floor(Date.now() / 1e3).toString(16);
  const random = randomHex(12);
  return `${timestamp}-${random}-${serviceShort}`;
}
function generateRequestId(prefix = "req") {
  return `${prefix}_${randomHex(12)}`;
}
function parseTraceId(traceId) {
  const parts = traceId.split("-");
  if (parts.length < 3) {
    return { valid: false, raw: traceId };
  }
  const [timestampHex, random, ...serviceParts] = parts;
  const timestamp = parseInt(timestampHex, 16);
  if (isNaN(timestamp)) {
    return { valid: false, raw: traceId };
  }
  return {
    valid: true,
    timestamp,
    random,
    serviceShort: serviceParts.join("-")
  };
}

// src/tracing/middleware.ts
var TRACE_ID_HEADER = "X-Trace-ID";
var REQUEST_ID_HEADER = "X-Request-ID";
var PARENT_SPAN_ID_HEADER = "X-Parent-Span-ID";
var DEPLOYMENT_ID_HEADER = "X-Deployment-ID";
var RESPONSE_TIME_HEADER = "X-Response-Time";
var SERVED_BY_HEADER = "X-Served-By";
function addTracingHeaders(response, context, options) {
  const buildInfo = getCachedBuildInfo();
  const headers = new Headers(response.headers);
  if (context.traceId) {
    headers.set(TRACE_ID_HEADER, context.traceId);
  }
  if (context.requestId) {
    headers.set(REQUEST_ID_HEADER, context.requestId);
  }
  headers.set(RESPONSE_TIME_HEADER, `${options.durationMs.toFixed(2)}ms`);
  headers.set(
    SERVED_BY_HEADER,
    `${options.serviceName}-${buildInfo.shortCommit}`
  );
  if (buildInfo.deploymentId) {
    headers.set(DEPLOYMENT_ID_HEADER, buildInfo.deploymentId);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
function withTracing(handler, options) {
  const { serviceName, serviceShort = serviceName.substring(0, 4) } = options;
  return (async (request, ...args) => {
    const startTime3 = Date.now();
    const upstreamContext = parseTraceContextFromHeaders(request.headers);
    const context = {
      traceId: upstreamContext.traceId || generateTraceId(serviceShort),
      requestId: generateRequestId(serviceShort),
      parentSpanId: upstreamContext.parentSpanId
    };
    const response = await runWithTraceContext(
      context,
      () => handler(request, ...args)
    );
    const durationMs = Date.now() - startTime3;
    return addTracingHeaders(response, context, {
      serviceName,
      durationMs
    });
  });
}
function getTraceHeaders() {
  const context = getTraceContext();
  const buildInfo = getCachedBuildInfo();
  const headers = {};
  if (context.traceId) {
    headers[TRACE_ID_HEADER] = context.traceId;
  }
  if (context.requestId) {
    headers[PARENT_SPAN_ID_HEADER] = context.requestId;
  }
  if (buildInfo.deploymentId) {
    headers[DEPLOYMENT_ID_HEADER] = buildInfo.deploymentId;
  }
  return headers;
}

// src/http/client.ts
async function tracedFetch(url, options = {}) {
  const { injectTracing = true, headers: userHeaders, ...restOptions } = options;
  const headers = new Headers(userHeaders);
  if (injectTracing) {
    const traceHeaders = getTraceHeaders();
    for (const [key, value] of Object.entries(traceHeaders)) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }
  }
  return fetch(url, {
    ...restOptions,
    headers
  });
}
function createTracedClient(baseUrl) {
  async function request(method, path, options = {}) {
    const url = new URL(path, baseUrl);
    return tracedFetch(url, {
      method,
      ...options
    });
  }
  return {
    /**
     * 发送 GET 请求
     */
    get: (path, options) => request("GET", path, options),
    /**
     * 发送 POST 请求
     */
    post: (path, body, options) => request("POST", path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : void 0
    }),
    /**
     * 发送 PUT 请求
     */
    put: (path, body, options) => request("PUT", path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : void 0
    }),
    /**
     * 发送 PATCH 请求
     */
    patch: (path, body, options) => request("PATCH", path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers
      },
      body: body ? JSON.stringify(body) : void 0
    }),
    /**
     * 发送 DELETE 请求
     */
    delete: (path, options) => request("DELETE", path, options),
    /**
     * 发送自定义请求
     */
    request
  };
}

exports.DEPLOYMENT_ID_HEADER = DEPLOYMENT_ID_HEADER;
exports.PARENT_SPAN_ID_HEADER = PARENT_SPAN_ID_HEADER;
exports.REQUEST_ID_HEADER = REQUEST_ID_HEADER;
exports.RESPONSE_TIME_HEADER = RESPONSE_TIME_HEADER;
exports.SERVED_BY_HEADER = SERVED_BY_HEADER;
exports.TRACE_ID_HEADER = TRACE_ID_HEADER;
exports.addTracingHeaders = addTracingHeaders;
exports.configureLogger = configureLogger;
exports.createDebugConfigHandler = createDebugConfigHandler;
exports.createDebugInfoHandler = createDebugInfoHandler;
exports.createHealthHandler = createHealthHandler;
exports.createLogger = createLogger;
exports.createTracedClient = createTracedClient;
exports.generateRequestId = generateRequestId;
exports.generateTraceId = generateTraceId;
exports.getBuildInfo = getBuildInfo;
exports.getCachedBuildInfo = getCachedBuildInfo;
exports.getDebugConfig = getDebugConfig;
exports.getDebugInfo = getDebugInfo;
exports.getLogger = getLogger;
exports.getParentSpanId = getParentSpanId;
exports.getRequestId = getRequestId;
exports.getTraceContext = getTraceContext;
exports.getTraceHeaders = getTraceHeaders;
exports.getTraceId = getTraceId;
exports.parseTraceContextFromHeaders = parseTraceContextFromHeaders;
exports.parseTraceId = parseTraceId;
exports.runHealthChecks = runHealthChecks;
exports.runWithTraceContext = runWithTraceContext;
exports.tracedFetch = tracedFetch;
exports.withTracing = withTracing;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map