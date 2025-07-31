// Hono アプリケーション - エントリーポイント

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { PrismaClient } from "@prisma/client";

// 環境変数の読み込み（dotenvは不要、Node.jsが自動読み込み）
console.log("🔧 環境設定:");
console.log(`  NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL || "file:./dev.db"}`);
console.log(`  PORT: ${process.env.PORT || "8000"}`);
console.log(
  `  ALLOWED_ORIGINS: ${
    process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001"
  }`
);

// リポジトリ
import { StudyRepository } from "./infrastructure/database/repositories/StudyRepository.js";

// ユースケース
import { GetStudyPlanUseCase } from "./domain/usecases/GetStudyPlan.js";
import { UpdateStudyProgressUseCase } from "./domain/usecases/UpdateStudyProgress.js";

// ルート
import { createStudyRoutes } from "./infrastructure/web/routes/study.js";

// 依存性注入コンテナ
class DIContainer {
  private static instance: DIContainer;
  private _prisma: PrismaClient;
  private _studyRepository: StudyRepository;
  private _getStudyPlanUseCase: GetStudyPlanUseCase;
  private _updateStudyProgressUseCase: UpdateStudyProgressUseCase;

  private constructor() {
    // Prisma Client
    this._prisma = new PrismaClient();

    // Repository
    this._studyRepository = new StudyRepository(this._prisma);

    // Use Cases
    this._getStudyPlanUseCase = new GetStudyPlanUseCase(this._studyRepository);
    this._updateStudyProgressUseCase = new UpdateStudyProgressUseCase(
      this._studyRepository
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
  get getStudyPlanUseCase() {
    return this._getStudyPlanUseCase;
  }
  get updateStudyProgressUseCase() {
    return this._updateStudyProgressUseCase;
  }
}

// アプリケーション初期化
const app = new Hono();
const container = DIContainer.getInstance();

// ミドルウェア
app.use("*", logger());
// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map(origin => origin.trim()) || [
  "http://localhost:3000",
  "http://localhost:3001",
];

app.use(
  "*",
  cors({
    origin: (origin) => {
      console.log(`🔍 CORS チェック: Origin = ${origin || 'null'}`)
      
      // オリジンなしのリクエスト（curl, Postman等）は開発環境でのみ許可
      if (!origin) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ オリジンなしリクエストを開発環境で許可')
          return '*'
        }
        console.log('❌ 本番環境でオリジンなしリクエストを拒否')
        return null
      }
      
      // 許可されたオリジンかチェック
      if (allowedOrigins.includes(origin)) {
        console.log(`✅ 許可されたオリジン: ${origin}`)
        return origin
      }
      
      // 許可されていないオリジンは拒否
      console.log(`❌ 許可されていないオリジン: ${origin}`)
      console.log(`許可済みオリジン: ${allowedOrigins.join(', ')}`)
      return null
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: [
      "Content-Type", 
      "Authorization", 
      "X-Requested-With",
      "Accept",
      "Origin"
    ],
    credentials: true, // 認証情報を含むリクエストを許可
    maxAge: 86400,     // プリフライトリクエストのキャッシュ時間（24時間）
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

// API ルート
app.route(
  "/api/study",
  createStudyRoutes(
    container.getStudyPlanUseCase,
    container.updateStudyProgressUseCase
  )
);

// エラーハンドリング
app.onError((err, c) => {
  console.error("Error:", err);

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
  console.log("シャットダウン中...");
  await container.prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("シャットダウン中...");
  await container.prisma.$disconnect();
  process.exit(0);
});

// サーバー起動設定
const DEFAULT_PORT = 8000;
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;

// ポート番号のバリデーション
if (isNaN(port) || port < 1 || port > 65535) {
  console.error(
    `❌ 無効なポート番号: ${process.env.PORT}. デフォルトポート ${DEFAULT_PORT} を使用します。`
  );
  process.exit(1);
}

async function startServer() {
  console.log(`🚀 サーバーを起動中... ポート: ${port}`);
  console.log(`📊 API仕様: http://localhost:${port}/`);
  console.log(`🎯 学習計画API: http://localhost:${port}/api/study/plan`);

  // Node.js環境でサーバー起動
  const { serve } = await import("@hono/node-server");
  serve({
    fetch: app.fetch,
    port: Number(port),
  });
  console.log(`✅ サーバーが起動しました: http://localhost:${port}`);
}

// 開発環境では直接起動
if (process.env.NODE_ENV !== "production") {
  startServer();
}

export default {
  port,
  fetch: app.fetch,
};
