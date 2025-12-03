/**
 * 构建信息模块
 *
 * 从环境变量读取 Docker 构建时注入的版本信息
 */

export interface BuildInfo {
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
export function getBuildInfo(): BuildInfo {
  const gitCommit = process.env.GIT_COMMIT || "unknown";

  return {
    gitCommit,
    shortCommit: gitCommit.substring(0, 7),
    gitBranch: process.env.GIT_BRANCH || "unknown",
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
    version: process.env.APP_VERSION || "0.0.0",
    environment: process.env.NODE_ENV || "development",
    deploymentId: process.env.DEPLOYMENT_ID || "",
  };
}

// 单例缓存
let cachedBuildInfo: BuildInfo | null = null;

/**
 * 获取缓存的构建信息
 */
export function getCachedBuildInfo(): BuildInfo {
  if (!cachedBuildInfo) {
    cachedBuildInfo = getBuildInfo();
  }
  return cachedBuildInfo;
}
