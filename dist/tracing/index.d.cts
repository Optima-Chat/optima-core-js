/**
 * 追踪 ID 生成模块
 */
/**
 * 生成 trace_id
 *
 * 格式: {timestamp_hex}-{random_hex}-{service_short}
 * 示例: 67890abc-f1e2d3c4b5a6-auth
 *
 * @param serviceShort - 服务简称（默认 "svc"）
 */
declare function generateTraceId(serviceShort?: string): string;
/**
 * 生成 request_id
 *
 * 格式: {prefix}_{random_hex}
 * 示例: auth_f1e2d3c4b5a6
 *
 * @param prefix - 前缀（默认 "req"）
 */
declare function generateRequestId(prefix?: string): string;
/**
 * 解析 trace_id
 */
declare function parseTraceId(traceId: string): {
    valid: boolean;
    timestamp?: number;
    random?: string;
    serviceShort?: string;
    raw?: string;
};

/**
 * 追踪上下文模块
 *
 * 使用 AsyncLocalStorage 实现异步上下文隔离
 */
interface TraceContext {
    traceId?: string;
    requestId?: string;
    parentSpanId?: string;
}
/**
 * 获取当前追踪上下文
 */
declare function getTraceContext(): TraceContext;
/**
 * 获取当前 trace_id
 */
declare function getTraceId(): string | undefined;
/**
 * 获取当前 request_id
 */
declare function getRequestId(): string | undefined;
/**
 * 获取当前 parent_span_id
 */
declare function getParentSpanId(): string | undefined;
/**
 * 在追踪上下文中运行函数
 *
 * @example
 * await runWithTraceContext(
 *   { traceId: 'trace-123', requestId: 'req-456' },
 *   async () => {
 *     // 这里可以访问上下文
 *     const traceId = getTraceId();
 *   }
 * );
 */
declare function runWithTraceContext<T>(context: TraceContext, fn: () => T): T;
/**
 * 从请求 header 解析追踪上下文
 */
declare function parseTraceContextFromHeaders(headers: Headers): TraceContext;

/**
 * Next.js 追踪中间件模块
 */

declare const TRACE_ID_HEADER = "X-Trace-ID";
declare const REQUEST_ID_HEADER = "X-Request-ID";
declare const PARENT_SPAN_ID_HEADER = "X-Parent-Span-ID";
declare const DEPLOYMENT_ID_HEADER = "X-Deployment-ID";
declare const RESPONSE_TIME_HEADER = "X-Response-Time";
declare const SERVED_BY_HEADER = "X-Served-By";
interface TracingOptions {
    serviceName: string;
    serviceShort?: string;
}
/**
 * 为响应添加追踪 header
 */
declare function addTracingHeaders(response: Response, context: TraceContext, options: {
    serviceName: string;
    durationMs: number;
}): Response;
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
declare function withTracing<T extends (request: Request, ...args: unknown[]) => Promise<Response>>(handler: T, options: TracingOptions): T;
/**
 * 获取需要传递给下游服务的追踪 header
 */
declare function getTraceHeaders(): Record<string, string>;

export { DEPLOYMENT_ID_HEADER, PARENT_SPAN_ID_HEADER, REQUEST_ID_HEADER, RESPONSE_TIME_HEADER, SERVED_BY_HEADER, TRACE_ID_HEADER, type TraceContext, type TracingOptions, addTracingHeaders, generateRequestId, generateTraceId, getParentSpanId, getRequestId, getTraceContext, getTraceHeaders, getTraceId, parseTraceContextFromHeaders, parseTraceId, runWithTraceContext, withTracing };
