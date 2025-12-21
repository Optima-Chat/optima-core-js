/**
 * 健康检查模块
 */
interface HealthCheckResult {
    status: "healthy" | "unhealthy";
    latencyMs?: number;
    error?: string;
}
type HealthCheckFn = () => Promise<HealthCheckResult> | HealthCheckResult;
interface HealthChecks {
    [name: string]: HealthCheckFn;
}
interface HealthResponse {
    status: "healthy" | "unhealthy";
    service: string;
    version: string;
    gitCommit: string;
    gitBranch: string;
    environment: string;
    uptimeSeconds: number;
    timestamp: string;
    checks: Record<string, HealthCheckResult>;
}
/**
 * 运行健康检查
 */
declare function runHealthChecks(serviceName: string, checks?: HealthChecks): Promise<HealthResponse>;
/**
 * 创建 Next.js API Route 健康检查处理器
 *
 * @example
 * // app/api/health/route.ts
 * import { createHealthHandler } from '@optima/core/diagnostics';
 *
 * export const GET = createHealthHandler({
 *   serviceName: 'agentic-chat',
 *   checks: {
 *     database: async () => {
 *       // 检查数据库
 *       return { status: 'healthy' };
 *     },
 *   },
 * });
 */
declare function createHealthHandler(options: {
    serviceName: string;
    checks?: HealthChecks;
}): () => Promise<Response>;

/**
 * 调试端点模块
 */
interface DebugInfoResponse {
    build: {
        gitCommit: string;
        gitBranch: string;
        buildDate: string;
        version: string;
    };
    runtime: {
        nodeVersion: string;
        environment: string;
        debugMode: boolean;
        logLevel: string;
    };
    startupTime: string;
    uptimeSeconds: number;
}
interface DebugConfigResponse {
    config: Record<string, string>;
    /** 构建时内联的环境变量（如 Next.js 的 NEXT_PUBLIC_*） */
    buildTimeConfig?: Record<string, string>;
    infisicalEnabled: boolean;
    configSource: string;
    environment: string;
}
/**
 * 获取调试信息
 */
declare function getDebugInfo(): DebugInfoResponse;
/**
 * 获取脱敏后的配置
 */
declare function getDebugConfig(allowedPrefixes?: string[], buildTimeEnv?: Record<string, string | undefined>): DebugConfigResponse;
/**
 * 验证 Debug Key
 */
declare function validateDebugKey(request: Request): boolean;
/**
 * 创建 /debug/info 端点处理器
 *
 * @example
 * // app/api/debug/info/route.ts
 * import { createDebugInfoHandler } from '@optima/core/diagnostics';
 * export const GET = createDebugInfoHandler();
 */
declare function createDebugInfoHandler(options?: {
    requireKey?: boolean;
}): (request: Request) => Promise<Response>;
/**
 * 创建 /debug/config 端点处理器
 *
 * @example
 * // app/api/debug/config/route.ts (Node.js 服务)
 * import { createDebugConfigHandler } from '@optima/core/diagnostics';
 * export const GET = createDebugConfigHandler();
 *
 * @example
 * // app/api/debug/config/route.ts (Next.js 服务，需要展示构建时内联的 NEXT_PUBLIC_* 变量)
 * import { createDebugConfigHandler } from '@optima/core/diagnostics';
 * export const GET = createDebugConfigHandler({
 *   allowedPrefixes: ['DATABASE', 'MCP', 'NEXT_PUBLIC'],
 *   // 构建时内联的值（webpack 会在构建时替换 process.env.NEXT_PUBLIC_*）
 *   buildTimeEnv: {
 *     NEXT_PUBLIC_SHOP_DOMAIN: process.env.NEXT_PUBLIC_SHOP_DOMAIN,
 *     NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
 *   }
 * });
 */
declare function createDebugConfigHandler(options?: {
    allowedPrefixes?: string[];
    /** 构建时内联的环境变量，用于 Next.js 等在构建时替换 process.env 的框架 */
    buildTimeEnv?: Record<string, string | undefined>;
}): (request: Request) => Promise<Response>;

export { type DebugConfigResponse, type DebugInfoResponse, type HealthCheckFn, type HealthCheckResult, type HealthChecks, type HealthResponse, createDebugConfigHandler, createDebugInfoHandler, createHealthHandler, getDebugConfig, getDebugInfo, runHealthChecks, validateDebugKey };
