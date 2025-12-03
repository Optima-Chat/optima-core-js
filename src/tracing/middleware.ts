/**
 * Next.js 追踪中间件模块
 */

import { getCachedBuildInfo } from "../config/build-info";
import {
  getTraceContext,
  parseTraceContextFromHeaders,
  runWithTraceContext,
  type TraceContext,
} from "./context";
import { generateRequestId, generateTraceId } from "./ids";

// Header 常量
export const TRACE_ID_HEADER = "X-Trace-ID";
export const REQUEST_ID_HEADER = "X-Request-ID";
export const PARENT_SPAN_ID_HEADER = "X-Parent-Span-ID";
export const DEPLOYMENT_ID_HEADER = "X-Deployment-ID";
export const RESPONSE_TIME_HEADER = "X-Response-Time";
export const SERVED_BY_HEADER = "X-Served-By";

export interface TracingOptions {
  serviceName: string;
  serviceShort?: string;
}

/**
 * 为响应添加追踪 header
 */
export function addTracingHeaders(
  response: Response,
  context: TraceContext,
  options: {
    serviceName: string;
    durationMs: number;
  }
): Response {
  const buildInfo = getCachedBuildInfo();

  // 克隆响应以添加 header
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
    headers,
  });
}

/**
 * 包装 API route handler 添加追踪支持
 *
 * @example
 * // app/api/users/route.ts
 * import { withTracing } from '@optima/core/tracing';
 *
 * async function handler(request: Request) {
 *   return Response.json({ users: [] });
 * }
 *
 * export const GET = withTracing(handler, {
 *   serviceName: 'agentic-chat',
 *   serviceShort: 'chat',
 * });
 */
export function withTracing<T extends (request: Request, ...args: unknown[]) => Promise<Response>>(
  handler: T,
  options: TracingOptions
): T {
  const { serviceName, serviceShort = serviceName.substring(0, 4) } = options;

  return (async (request: Request, ...args: unknown[]) => {
    const startTime = Date.now();

    // 从 header 解析上游追踪信息
    const upstreamContext = parseTraceContextFromHeaders(request.headers);

    // 创建当前请求的上下文
    const context: TraceContext = {
      traceId: upstreamContext.traceId || generateTraceId(serviceShort),
      requestId: generateRequestId(serviceShort),
      parentSpanId: upstreamContext.parentSpanId,
    };

    // 在追踪上下文中运行 handler
    const response = await runWithTraceContext(context, () =>
      handler(request, ...args)
    );

    const durationMs = Date.now() - startTime;

    // 添加追踪 header 到响应
    return addTracingHeaders(response, context, {
      serviceName,
      durationMs,
    });
  }) as T;
}

/**
 * 获取需要传递给下游服务的追踪 header
 */
export function getTraceHeaders(): Record<string, string> {
  const context = getTraceContext();
  const buildInfo = getCachedBuildInfo();
  const headers: Record<string, string> = {};

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
