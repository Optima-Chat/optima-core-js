/**
 * 带追踪的 HTTP 客户端模块
 */

import { getTraceHeaders } from "../tracing/middleware";

export interface TracedFetchOptions extends RequestInit {
  /** 是否自动注入追踪 header（默认 true） */
  injectTracing?: boolean;
}

/**
 * 带追踪的 fetch 函数
 *
 * 自动注入追踪 header 到请求中
 *
 * @example
 * import { tracedFetch } from '@optima/core/http';
 *
 * // 在 API route 中使用（已有追踪上下文）
 * const response = await tracedFetch('http://other-service/api/data');
 *
 * // 禁用追踪注入
 * const response = await tracedFetch('http://api.example.com', {
 *   injectTracing: false,
 * });
 */
export async function tracedFetch(
  url: string | URL,
  options: TracedFetchOptions = {}
): Promise<Response> {
  const { injectTracing = true, headers: userHeaders, ...restOptions } = options;

  const headers = new Headers(userHeaders);

  // 注入追踪 header
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
    headers,
  });
}

/**
 * 创建带基础 URL 的 traced fetch 客户端
 *
 * @example
 * const api = createTracedClient('http://user-auth:8000');
 *
 * const response = await api.get('/users/123');
 * const data = await api.post('/users', { name: 'John' });
 */
export function createTracedClient(baseUrl: string) {
  async function request(
    method: string,
    path: string,
    options: TracedFetchOptions = {}
  ): Promise<Response> {
    const url = new URL(path, baseUrl);
    return tracedFetch(url, {
      method,
      ...options,
    });
  }

  return {
    /**
     * 发送 GET 请求
     */
    get: (path: string, options?: TracedFetchOptions) =>
      request("GET", path, options),

    /**
     * 发送 POST 请求
     */
    post: (
      path: string,
      body?: unknown,
      options?: TracedFetchOptions
    ) =>
      request("POST", path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      }),

    /**
     * 发送 PUT 请求
     */
    put: (
      path: string,
      body?: unknown,
      options?: TracedFetchOptions
    ) =>
      request("PUT", path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      }),

    /**
     * 发送 PATCH 请求
     */
    patch: (
      path: string,
      body?: unknown,
      options?: TracedFetchOptions
    ) =>
      request("PATCH", path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      }),

    /**
     * 发送 DELETE 请求
     */
    delete: (path: string, options?: TracedFetchOptions) =>
      request("DELETE", path, options),

    /**
     * 发送自定义请求
     */
    request,
  };
}
