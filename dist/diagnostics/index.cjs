'use strict';

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
function getDebugConfig(allowedPrefixes = ["DATABASE", "REDIS", "OAUTH", "CORS", "API"], buildTimeEnv) {
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
  let buildTimeConfig;
  if (buildTimeEnv) {
    buildTimeConfig = {};
    for (const [key, value] of Object.entries(buildTimeEnv)) {
      if (value) {
        buildTimeConfig[key] = maskValue(key, value);
      }
    }
  }
  return {
    config,
    buildTimeConfig,
    infisicalEnabled: !!process.env.INFISICAL_CLIENT_ID,
    configSource: process.env.INFISICAL_CLIENT_ID ? "infisical" : "env",
    environment: process.env.NODE_ENV || "development"
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
    return Response.json(
      getDebugConfig(options?.allowedPrefixes, options?.buildTimeEnv),
      {
        headers: { "Cache-Control": "no-store" }
      }
    );
  };
}

exports.createDebugConfigHandler = createDebugConfigHandler;
exports.createDebugInfoHandler = createDebugInfoHandler;
exports.createHealthHandler = createHealthHandler;
exports.getDebugConfig = getDebugConfig;
exports.getDebugInfo = getDebugInfo;
exports.runHealthChecks = runHealthChecks;
exports.validateDebugKey = validateDebugKey;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map