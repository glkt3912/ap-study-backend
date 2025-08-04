// Hono アプリケーション - エントリーポイント

import { Hono } from "hono";
import { createOpenAPIApp } from "src/infrastructure/web/openapi.js";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { PrismaClient } from "@prisma/client";
import { logger } from "src/utils/logger.js";

// 環境変数の読み込み（dotenvは不要、Node.jsが自動読み込み）
logger.info("🔧 環境設定:");
logger.info(`  NODE_ENV: ${process.env.NODE_ENV || "development"}`);
logger.info(`  DATABASE_URL: ${process.env.DATABASE_URL || "file:./dev.db"}`);
logger.info(`  PORT: ${process.env.PORT || "8000"}`);
logger.info(
  `  ALLOWED_ORIGINS: ${
    process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001"
  }`
);

// リポジトリ
import { StudyRepository } from "src/infrastructure/database/repositories/StudyRepository.js";
import { StudyLogRepository } from "src/infrastructure/database/repositories/StudyLogRepository.js";
import { LearningEfficiencyAnalysisRepository } from "src/infrastructure/database/repositories/learning-efficiency-analyzerRepository.js";

// ユースケース
import { GetStudyPlanUseCase } from "src/domain/usecases/GetStudyPlan.js";
import { UpdateStudyProgressUseCase } from "src/domain/usecases/UpdateStudyProgress.js";
import { CreateStudyLogUseCase } from "src/domain/usecases/CreateStudyLog.js";
import { LearningEfficiencyAnalysisUseCase } from "src/domain/usecases/learning-efficiency-analyzer.js";

// ルート
import { createStudyRoutes } from "src/infrastructure/web/routes/study.js";
import { createStudyLogRoutes } from "src/infrastructure/web/routes/studylog.js";
import { createTestRoutes } from "src/infrastructure/web/routes/test.js";
import { createAnalysisRoutes } from "src/infrastructure/web/routes/analysis-routes.js";
import { createQuizRoutes } from "src/infrastructure/web/routes/quiz.js";
import { createLearningEfficiencyAnalysisRoutes } from "src/infrastructure/web/routes/learning-efficiency-analyzer.js";
import authRoutes from "src/infrastructure/web/routes/auth.js";

// ミドルウェア
import { authMiddleware, optionalAuthMiddleware } from "src/infrastructure/web/middleware/auth.js";

// 依存性注入コンテナ
class DIContainer {
  private static instance: DIContainer;
  private _prisma: PrismaClient;
  private _studyRepository: StudyRepository;
  private _studyLogRepository: StudyLogRepository;
  private _learningEfficiencyAnalysisRepository: LearningEfficiencyAnalysisRepository;
  private _getStudyPlanUseCase: GetStudyPlanUseCase;
  private _updateStudyProgressUseCase: UpdateStudyProgressUseCase;
  private _createStudyLogUseCase: CreateStudyLogUseCase;
  private _learningEfficiencyAnalysisUseCase: LearningEfficiencyAnalysisUseCase;

  private constructor() {
    // Prisma Client
    this._prisma = new PrismaClient();

    // Repository
    this._studyRepository = new StudyRepository(this._prisma);
    this._studyLogRepository = new StudyLogRepository(this._prisma);
    this._learningEfficiencyAnalysisRepository = new LearningEfficiencyAnalysisRepository(this._prisma);

    // Use Cases
    this._getStudyPlanUseCase = new GetStudyPlanUseCase(this._studyRepository);
    this._updateStudyProgressUseCase = new UpdateStudyProgressUseCase(
      this._studyRepository
    );
    this._createStudyLogUseCase = new CreateStudyLogUseCase(
      this._studyLogRepository
    );
    this._learningEfficiencyAnalysisUseCase = new LearningEfficiencyAnalysisUseCase(
      this._learningEfficiencyAnalysisRepository,
      this._studyLogRepository
    );
  }

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  get prisma() {
    return this._prisma;
  }
  get studyRepository() {
    return this._studyRepository;
  }
  get studyLogRepository() {
    return this._studyLogRepository;
  }
  get getStudyPlanUseCase() {
    return this._getStudyPlanUseCase;
  }
  get updateStudyProgressUseCase() {
    return this._updateStudyProgressUseCase;
  }
  get createStudyLogUseCase() {
    return this._createStudyLogUseCase;
  }
  get learningEfficiencyAnalysisUseCase() {
    return this._learningEfficiencyAnalysisUseCase;
  }
}

// アプリケーション初期化 - OpenAPI対応アプリを作成
const app = createOpenAPIApp();
const container = DIContainer.getInstance();

// ミドルウェア
app.use("*", honoLogger());

// セキュリティヘッダー
app.use("*", async (c, next) => {
  // 基本セキュリティヘッダー
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // 本番環境追加セキュリティ
  if (process.env.NODE_ENV === "production") {
    // HSTS（HTTPS強制）
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    
    // CSP（Content Security Policy）
    c.header("Content-Security-Policy", 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https:; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none';"
    );
    
    // 追加セキュリティヘッダー
    c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    c.header("Cross-Origin-Embedder-Policy", "require-corp");
    c.header("Cross-Origin-Opener-Policy", "same-origin");
    c.header("Cross-Origin-Resource-Policy", "cross-origin");
  }
  
  await next();
});

// CORS設定 - 環境別許可オリジン
const getProductionOrigins = () => {
  return [
    'https://ap-study-app.vercel.app',
    'https://ap-study-backend.railway.app',
    'https://ap-study-backend.up.railway.app'
  ]
}

const getDevelopmentOrigins = () => {
  return [
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ]
}

const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? process.env.ALLOWED_ORIGINS?.split(",").map(origin => origin.trim()) || getProductionOrigins()
  : process.env.ALLOWED_ORIGINS?.split(",").map(origin => origin.trim()) || getDevelopmentOrigins()

app.use(
  "*",
  cors({
    origin: (origin) => {
      logger.debug(`🔍 CORS チェック: Origin = ${origin || "null"}`);

      // オリジンなしのリクエスト（curl, Postman等）は開発環境でのみ許可
      if (!origin) {
        if (process.env.NODE_ENV === "development") {
          logger.debug("✅ オリジンなしリクエストを開発環境で許可");
          return "*";
        }
        logger.warn("❌ 本番環境でオリジンなしリクエストを拒否");
        return null;
      }

      // 許可されたオリジンかチェック
      if (allowedOrigins.includes(origin)) {
        logger.debug(`✅ 許可されたオリジン: ${origin}`);
        return origin;
      }

      // 許可されていないオリジンは拒否
      logger.warn(`❌ 許可されていないオリジン: ${origin}`);
      logger.debug(`許可済みオリジン: ${allowedOrigins.join(", ")}`);
      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "X-User-ID", // 移行期間中の簡易認証用
    ],
    credentials: true, // 認証情報を含むリクエストを許可
    maxAge: 86400, // プリフライトリクエストのキャッシュ時間（24時間）
  })
);

// ヘルスチェック
app.get("/", (c) => {
  return c.json({
    message: "応用情報技術者試験 学習管理API",
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// 認証API（認証不要）
app.route("/api/auth", authRoutes);

// 認証が必要なAPIエンドポイント
app.use("/api/study/*", authMiddleware);
app.use("/api/studylog/*", authMiddleware);
app.use("/api/test/*", authMiddleware);
app.use("/api/analysis/*", optionalAuthMiddleware); // 分析は読み取り専用なのでオプショナル認証
app.use("/api/quiz/*", authMiddleware);
app.use("/api/learning-efficiency-analysis/*", optionalAuthMiddleware);

// API ルート
app.route(
  "/api/study",
  createStudyRoutes(
    container.getStudyPlanUseCase,
    container.updateStudyProgressUseCase
  )
);

// 学習記録API
app.route(
  "/api/studylog",
  createStudyLogRoutes(
    container.createStudyLogUseCase,
    container.studyLogRepository
  )
);

// 問題演習記録API
app.route("/api/test", createTestRoutes(container.prisma));

// 分析API
app.route("/api/analysis", createAnalysisRoutes(container.prisma));

// Quiz API
app.route("/api/quiz", createQuizRoutes());

// Learning Efficiency Analysis API
app.route("/api/learning-efficiency-analysis", createLearningEfficiencyAnalysisRoutes(container.learningEfficiencyAnalysisUseCase));

// エラーハンドリング
app.onError((err, c) => {
  logger.error("Error:", err);

  return c.json(
    {
      success: false,
      error: "内部サーバーエラーが発生しました",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  );
});

// 404 ハンドリング
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "エンドポイントが見つかりません",
      path: c.req.path,
    },
    404
  );
});

// グレースフルシャットダウン
process.on("SIGINT", async () => {
  logger.info("シャットダウン中...");
  await container.prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("シャットダウン中...");
  await container.prisma.$disconnect();
  process.exit(0);
});

// サーバー起動設定
const DEFAULT_PORT = 8000;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;

// ポート番号のバリデーション
if (isNaN(port) || port < 1 || port > 65535) {
  logger.error(
    `❌ 無効なポート番号: ${process.env.PORT}. デフォルトポート ${DEFAULT_PORT} を使用します。`
  );
  process.exit(1);
}

async function startServer() {
  logger.info(`🚀 サーバーを起動中... ポート: ${port}`);
  logger.info(`📊 API仕様: http://localhost:${port}/`);
  logger.info(`📄 OpenAPI仕様書: http://localhost:${port}/doc`);
  logger.info(`🔧 Swagger UI: http://localhost:${port}/ui`);
  logger.info(`🎯 学習計画API: http://localhost:${port}/api/study/plan`);
  logger.info(`📝 学習記録API: http://localhost:${port}/api/studylog`);
  logger.info(`📋 問題演習API: http://localhost:${port}/api/test`);
  logger.info(`📊 分析API: http://localhost:${port}/api/analysis`);
  logger.info(`🧭 Quiz API: http://localhost:${port}/api/quiz`);
  logger.info(`📈 Learning Efficiency Analysis API: http://localhost:${port}/api/learning-efficiency-analysis`);
  logger.info(`🔐 Authentication API: http://localhost:${port}/api/auth`);

  // Node.js環境でサーバー起動
  const { serve } = await import("@hono/node-server");
  serve({
    fetch: app.fetch,
    port: Number(port),
  });
  logger.info(`✅ サーバーが起動しました: http://localhost:${port}`);
}

// 開発環境では直接起動
if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default {
  port,
  fetch: app.fetch,
};
