/**
 * 结构化日志模块
 */
type LogLevel = "debug" | "info" | "warn" | "error";
interface LogEntry {
    timestamp: string;
    level: LogLevel;
    service: string;
    version: string;
    gitCommit: string;
    environment: string;
    deploymentId?: string;
    traceId?: string;
    requestId?: string;
    parentSpanId?: string;
    message: string;
    extra?: Record<string, unknown>;
    exception?: {
        type: string;
        message: string;
        stack?: string;
    };
}
interface LoggerOptions {
    serviceName: string;
    format?: "json" | "text";
    level?: LogLevel;
}
/**
 * 创建结构化日志器
 */
declare function createLogger(options: LoggerOptions): {
    debug: (message: string, extra?: Record<string, unknown>) => void;
    info: (message: string, extra?: Record<string, unknown>) => void;
    warn: (message: string, extra?: Record<string, unknown>) => void;
    error: (message: string, extra?: Record<string, unknown>, error?: Error) => void;
    exception: (message: string, error: Error, extra?: Record<string, unknown>) => void;
};
/**
 * 配置默认 logger
 */
declare function configureLogger(options: LoggerOptions): void;
/**
 * 获取默认 logger
 */
declare function getLogger(): ReturnType<typeof createLogger>;

export { type LogEntry, type LogLevel, type LoggerOptions, configureLogger, createLogger, getLogger };
