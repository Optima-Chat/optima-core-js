/**
 * @optima/core - Optima 生产可观测性共享库
 *
 * 提供诊断、日志、追踪功能，专为 Next.js/Node.js 设计
 *
 * @example
 * // 健康检查端点
 * import { createHealthHandler } from '@optima/core/diagnostics';
 *
 * export const GET = createHealthHandler({
 *   serviceName: 'agentic-chat',
 *   checks: {
 *     database: async () => ({ status: 'healthy' }),
 *   },
 * });
 *
 * @example
 * // API route 追踪
 * import { withTracing } from '@optima/core/tracing';
 *
 * async function handler(request: Request) {
 *   return Response.json({ data: [] });
 * }
 *
 * export const GET = withTracing(handler, {
 *   serviceName: 'agentic-chat',
 * });
 *
 * @example
 * // 结构化日志
 * import { createLogger } from '@optima/core/logging';
 *
 * const logger = createLogger({ serviceName: 'agentic-chat' });
 * logger.info('Request processed', { userId: '123' });
 *
 * @example
 * // 带追踪的 HTTP 请求
 * import { tracedFetch } from '@optima/core/http';
 *
 * const response = await tracedFetch('http://user-auth/api/users');
 */

// Config
export { getBuildInfo, getCachedBuildInfo, type BuildInfo } from "./config";

// Diagnostics
export {
  createHealthHandler,
  runHealthChecks,
  createDebugInfoHandler,
  createDebugConfigHandler,
  getDebugInfo,
  getDebugConfig,
  type HealthCheckFn,
  type HealthChecks,
  type HealthCheckResult,
  type HealthResponse,
  type DebugInfoResponse,
  type DebugConfigResponse,
} from "./diagnostics";

// Logging
export {
  createLogger,
  configureLogger,
  getLogger,
  type LogLevel,
  type LogEntry,
  type LoggerOptions,
} from "./logging";

// Tracing
export {
  generateTraceId,
  generateRequestId,
  parseTraceId,
  getTraceContext,
  getTraceId,
  getRequestId,
  getParentSpanId,
  runWithTraceContext,
  parseTraceContextFromHeaders,
  withTracing,
  getTraceHeaders,
  addTracingHeaders,
  TRACE_ID_HEADER,
  REQUEST_ID_HEADER,
  PARENT_SPAN_ID_HEADER,
  DEPLOYMENT_ID_HEADER,
  RESPONSE_TIME_HEADER,
  SERVED_BY_HEADER,
  type TraceContext,
  type TracingOptions,
} from "./tracing";

// HTTP
export {
  tracedFetch,
  createTracedClient,
  type TracedFetchOptions,
} from "./http";
