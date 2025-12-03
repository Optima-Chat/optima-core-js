/**
 * 追踪上下文模块
 *
 * 使用 AsyncLocalStorage 实现异步上下文隔离
 */

import { AsyncLocalStorage } from "node:async_hooks";

export interface TraceContext {
  traceId?: string;
  requestId?: string;
  parentSpanId?: string;
}

// AsyncLocalStorage 实例
const asyncLocalStorage = new AsyncLocalStorage<TraceContext>();

/**
 * 获取当前追踪上下文
 */
export function getTraceContext(): TraceContext {
  return asyncLocalStorage.getStore() || {};
}

/**
 * 获取当前 trace_id
 */
export function getTraceId(): string | undefined {
  return getTraceContext().traceId;
}

/**
 * 获取当前 request_id
 */
export function getRequestId(): string | undefined {
  return getTraceContext().requestId;
}

/**
 * 获取当前 parent_span_id
 */
export function getParentSpanId(): string | undefined {
  return getTraceContext().parentSpanId;
}

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
export function runWithTraceContext<T>(
  context: TraceContext,
  fn: () => T
): T {
  return asyncLocalStorage.run(context, fn);
}

/**
 * 从请求 header 解析追踪上下文
 */
export function parseTraceContextFromHeaders(headers: Headers): TraceContext {
  return {
    traceId: headers.get("X-Trace-ID") || undefined,
    parentSpanId: headers.get("X-Parent-Span-ID") || undefined,
    // requestId 每个服务自己生成，不从 header 读取
  };
}
