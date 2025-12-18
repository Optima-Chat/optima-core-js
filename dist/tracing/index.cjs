'use strict';

var async_hooks = require('async_hooks');

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
    const startTime = Date.now();
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
    const durationMs = Date.now() - startTime;
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

exports.DEPLOYMENT_ID_HEADER = DEPLOYMENT_ID_HEADER;
exports.PARENT_SPAN_ID_HEADER = PARENT_SPAN_ID_HEADER;
exports.REQUEST_ID_HEADER = REQUEST_ID_HEADER;
exports.RESPONSE_TIME_HEADER = RESPONSE_TIME_HEADER;
exports.SERVED_BY_HEADER = SERVED_BY_HEADER;
exports.TRACE_ID_HEADER = TRACE_ID_HEADER;
exports.addTracingHeaders = addTracingHeaders;
exports.generateRequestId = generateRequestId;
exports.generateTraceId = generateTraceId;
exports.getParentSpanId = getParentSpanId;
exports.getRequestId = getRequestId;
exports.getTraceContext = getTraceContext;
exports.getTraceHeaders = getTraceHeaders;
exports.getTraceId = getTraceId;
exports.parseTraceContextFromHeaders = parseTraceContextFromHeaders;
exports.parseTraceId = parseTraceId;
exports.runWithTraceContext = runWithTraceContext;
exports.withTracing = withTracing;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map