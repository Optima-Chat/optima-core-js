export { DebugConfigResponse, DebugInfoResponse, HealthCheckFn, HealthCheckResult, HealthChecks, HealthResponse, createDebugConfigHandler, createDebugInfoHandler, createHealthHandler, getDebugConfig, getDebugInfo, runHealthChecks } from './diagnostics/index.js';
export { LogEntry, LogLevel, LoggerOptions, configureLogger, createLogger, getLogger } from './logging/index.js';
export { DEPLOYMENT_ID_HEADER, PARENT_SPAN_ID_HEADER, REQUEST_ID_HEADER, RESPONSE_TIME_HEADER, SERVED_BY_HEADER, TRACE_ID_HEADER, TraceContext, TracingOptions, addTracingHeaders, generateRequestId, generateTraceId, getParentSpanId, getRequestId, getTraceContext, getTraceHeaders, getTraceId, parseTraceContextFromHeaders, parseTraceId, runWithTraceContext, withTracing } from './tracing/index.js';
export { TracedFetchOptions, createTracedClient, tracedFetch } from './http/index.js';

/**
 * 构建信息模块
 *
 * 从环境变量读取 Docker 构建时注入的版本信息
 */
interface BuildInfo {
    /** Git commit hash */
    gitCommit: string;
    /** Git commit 短 hash */
    shortCommit: string;
    /** Git 分支名 */
    gitBranch: string;
    /** 构建日期 */
    buildDate: string;
    /** 应用版本 */
    version: string;
    /** 运行环境 */
    environment: string;
    /** 部署 ID（蓝绿部署） */
    deploymentId: string;
}
/**
 * 获取构建信息
 */
declare function getBuildInfo(): BuildInfo;
/**
 * 获取缓存的构建信息
 */
declare function getCachedBuildInfo(): BuildInfo;

export { type BuildInfo, getBuildInfo, getCachedBuildInfo };
