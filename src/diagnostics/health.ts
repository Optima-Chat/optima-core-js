/**
 * 健康检查模块
 */

import { getCachedBuildInfo } from "../config/build-info";

export interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  latencyMs?: number;
  error?: string;
}

export type HealthCheckFn = () => Promise<HealthCheckResult> | HealthCheckResult;

export interface HealthChecks {
  [name: string]: HealthCheckFn;
}

export interface HealthResponse {
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

// 启动时间
const startTime = Date.now();

/**
 * 运行健康检查
 */
export async function runHealthChecks(
  serviceName: string,
  checks: HealthChecks = {}
): Promise<HealthResponse> {
  const buildInfo = getCachedBuildInfo();
  const checkResults: Record<string, HealthCheckResult> = {};
  let overallHealthy = true;

  // 运行所有检查
  for (const [name, checkFn] of Object.entries(checks)) {
    const start = Date.now();
    try {
      const result = await checkFn();
      checkResults[name] = {
        ...result,
        latencyMs: Date.now() - start,
      };
      if (result.status === "unhealthy") {
        overallHealthy = false;
      }
    } catch (error) {
      overallHealthy = false;
      checkResults[name] = {
        status: "unhealthy",
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
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
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: checkResults,
  };
}

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
export function createHealthHandler(options: {
  serviceName: string;
  checks?: HealthChecks;
}): () => Promise<Response> {
  return async function GET(): Promise<Response> {
    const result = await runHealthChecks(
      options.serviceName,
      options.checks || {}
    );

    return Response.json(result, {
      status: result.status === "healthy" ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  };
}
