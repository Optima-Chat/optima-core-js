/**
 * 带追踪的 HTTP 客户端模块
 */
interface TracedFetchOptions extends RequestInit {
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
declare function tracedFetch(url: string | URL, options?: TracedFetchOptions): Promise<Response>;
/**
 * 创建带基础 URL 的 traced fetch 客户端
 *
 * @example
 * const api = createTracedClient('http://user-auth:8000');
 *
 * const response = await api.get('/users/123');
 * const data = await api.post('/users', { name: 'John' });
 */
declare function createTracedClient(baseUrl: string): {
    /**
     * 发送 GET 请求
     */
    get: (path: string, options?: TracedFetchOptions) => Promise<Response>;
    /**
     * 发送 POST 请求
     */
    post: (path: string, body?: unknown, options?: TracedFetchOptions) => Promise<Response>;
    /**
     * 发送 PUT 请求
     */
    put: (path: string, body?: unknown, options?: TracedFetchOptions) => Promise<Response>;
    /**
     * 发送 PATCH 请求
     */
    patch: (path: string, body?: unknown, options?: TracedFetchOptions) => Promise<Response>;
    /**
     * 发送 DELETE 请求
     */
    delete: (path: string, options?: TracedFetchOptions) => Promise<Response>;
    /**
     * 发送自定义请求
     */
    request: (method: string, path: string, options?: TracedFetchOptions) => Promise<Response>;
};

export { type TracedFetchOptions, createTracedClient, tracedFetch };
