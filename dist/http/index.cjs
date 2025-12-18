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
var asyncLocalStorage = new async_hooks.AsyncLocalStorage();
function getTraceContext() {
  return asyncLocalStorage.getStore() || {};
}

// src/tracing/middleware.ts
var TRACE_ID_HEADER = "X-Trace-ID";
var PARENT_SPAN_ID_HEADER = "X-Parent-Span-ID";
var DEPLOYMENT_ID_HEADER = "X-Deployment-ID";
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

exports.createTracedClient = createTracedClient;
exports.tracedFetch = tracedFetch;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map