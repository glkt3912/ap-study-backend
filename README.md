# 🔧 応用情報技術者試験 学習管理API (バックエンド)

Hono + Prisma + クリーンアーキテクチャで構築された高性能APIサーバーです。

## 🚀 クイックスタート

### Docker環境（推奨）

```bash
# プロジェクトルートから
cd ap-study-project
docker compose up --build

# API確認: http://localhost:3001
```

### ローカル環境

```bash
# 依存関係のインストール
npm install

# PostgreSQL データベース準備
createdb ap_study

# 環境変数設定
export DATABASE_URL="postgresql://postgres:password@localhost:5432/ap_study?schema=public"

# マイグレーション実行
npx prisma migrate deploy --schema=./src/infrastructure/database/prisma/schema.prisma

# データベース初期化とシード
npx tsx src/seed.ts

# 開発サーバー起動
npm run dev

# API確認: http://localhost:8000
```

## 🏛️ クリーンアーキテクチャ

```
src/
├── domain/                     # ドメイン層
│   ├── entities/              # エンティティ
│   │   ├── StudyWeek.ts       # 学習週エンティティ
│   │   └── StudyLog.ts        # 学習記録エンティティ
│   ├── repositories/          # リポジトリインターフェース
│   │   ├── IStudyRepository.ts
│   │   ├── IStudyLogRepository.ts
│   │   ├── IAnalysisRepository.ts
│   │   ├── IPredictionRepository.ts
│   │   └── IReviewRepository.ts
│   └── usecases/              # ユースケース
│       ├── GetStudyPlan.ts
│       ├── UpdateStudyProgress.ts
│       ├── CreateStudyLog.ts
│       ├── AnalyzeStudyData.ts
│       ├── PredictExamResults.ts
│       └── GenerateReviewSchedule.ts
├── infrastructure/            # インフラ層
│   ├── database/
│   │   ├── prisma/
│   │   │   └── schema.prisma   # データベーススキーマ
│   │   ├── repositories/       # リポジトリ実装
│   │   │   ├── StudyRepository.ts
│   │   │   ├── StudyLogRepository.ts
│   │   │   ├── AnalysisRepository.ts
│   │   │   ├── PredictionRepository.ts
│   │   │   └── ReviewRepository.ts
│   │   └── seeds/             # データベースシード
│   │       ├── questions-2022.json
│   │       ├── questions-2023.json
│   │       ├── questions-2024.json
│   │       ├── questions-2025.json
│   │       └── seed-questions.ts
│   └── web/                   # Web API
│       ├── routes/
│       │   ├── study.ts       # 学習関連ルート
│       │   ├── studylog.ts    # 学習記録ルート
│       │   ├── quiz.ts        # クイズルート
│       │   └── analysis-routes.ts # 分析ルート
│       └── middlewares/
├── utils/                     # ユーティリティ
│   └── logger.ts              # ログ機能
└── app.ts                     # アプリケーションエントリーポイント
```

## 🛠️ 技術スタック

- **Hono** - 高速軽量Webフレームワーク
- **Prisma** - Type-safe ORM
- **PostgreSQL** - リレーショナルデータベース
- **Supabase** - 本番データベース（PostgreSQL）
- **Zod** - スキーマバリデーション
- **TypeScript** - 型安全性
- **ESLint** - コード品質チェック
- **Prettier** - コードフォーマット

## ⚙️ 環境変数設定

### 必須環境変数

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `DATABASE_URL` | `"file:./dev.db"` | データベース接続文字列 |
| `SUPABASE_URL` | - | Supabase プロジェクト URL |
| `SUPABASE_ANON_KEY` | - | Supabase 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | - | Supabase サービスロールキー（オプション） |
| `PORT` | `8000` | サーバーポート番号 (1-65535) |
| `NODE_ENV` | `development` | 実行環境 |
| `ALLOWED_ORIGINS` | `"http://localhost:3000,http://localhost:3001"` | CORS許可オリジン |
| `LOG_LEVEL` | `info` | ログレベル |

### 設定例

**開発環境 (.env):**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ap_study?schema=public"
PORT=8000
NODE_ENV=development
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001"
LOG_LEVEL=info
```

**本番環境 (Supabase):**
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS="https://yourdomain.com,https://your-app.vercel.app"
LOG_LEVEL=warn
```

### CORS設定の詳細

- **開発環境**: オリジンなしリクエスト（curl等）を許可
- **本番環境**: `ALLOWED_ORIGINS`で指定されたドメインのみ許可
- **セキュリティ**: 不正オリジンは自動的に拒否

## 📡 API エンドポイント

### 学習計画API

#### `GET /api/study/plan`

全学習計画を取得

**レスポンス:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "weekNumber": 1,
      "title": "基礎固め期",
      "phase": "基礎固め期",
      "goals": ["基本的な概念理解"],
      "days": [...],
      "progressPercentage": 20.0,
      "totalStudyTime": 360,
      "averageUnderstanding": 3.5
    }
  ]
}
```

#### `GET /api/study/plan/:weekNumber`

特定週の計画を取得

#### `GET /api/study/current-week`

現在の週（未完了タスクがある最初の週）を取得

#### `POST /api/study/complete-task`

タスクを完了状態にする

**リクエスト:**

```json
{
  "weekNumber": 1,
  "dayIndex": 0
}
```

#### `PUT /api/study/progress`

学習進捗を更新

**リクエスト:**

```json
{
  "weekNumber": 1,
  "dayIndex": 0,
  "actualTime": 180,
  "understanding": 4,
  "memo": "理解できました",
  "completed": true
}
```

## 🗄️ データベーススキーマ

### StudyWeek テーブル

| カラム | 型 | 説明 |
|--------|----|----|
| id | INT | 主キー |
| weekNumber | INT | 週番号 (1-12) |
| title | STRING | 週のタイトル |
| phase | STRING | 学習フェーズ |
| goals | STRING | 学習目標 (JSON) |

### StudyDay テーブル

| カラム | 型 | 説明 |
|--------|----|----|
| id | INT | 主キー |
| weekId | INT | 週ID (外部キー) |
| day | STRING | 曜日 |
| subject | STRING | 科目 |
| topics | STRING | トピック (JSON) |
| estimatedTime | INT | 予定時間 (分) |
| actualTime | INT | 実際の時間 (分) |
| completed | BOOLEAN | 完了フラグ |
| understanding | INT | 理解度 (1-5) |
| memo | STRING | メモ |

## 🔧 開発コマンド

```bash
# 開発・実行
npm run dev          # 開発サーバー起動 (tsx watch)
npm run build        # TypeScriptビルド
npm run start        # プロダクション実行

# データベース
npm run db:generate  # Prisma クライアント生成
npm run db:push      # データベーススキーマ同期
npm run db:migrate   # マイグレーション実行
npm run db:studio    # Prisma Studio起動

# コード品質
npm run lint         # ESLint による静的解析
npm run lint:fix     # ESLint 自動修正
npm run format       # Prettier によるコードフォーマット
npm run format:check # フォーマット確認（CI用）
```

## 🏗️ アーキテクチャの利点

### 1. 関心の分離

- **ドメイン層**: ビジネスロジックに集中
- **インフラ層**: 外部システムとの連携
- **プレゼンテーション層**: HTTP APIの責務

### 2. 依存性の逆転

```typescript
// ユースケースは抽象に依存
class GetStudyPlanUseCase {
  constructor(private repository: IStudyRepository) {}
}

// 具象クラスは注入される
const useCase = new GetStudyPlanUseCase(new StudyRepository(prisma))
```

### 3. テスタビリティ

```typescript
// モックを使用したユニットテスト
const mockRepository = {
  findAllWeeks: jest.fn().mockResolvedValue(mockWeeks)
}
const useCase = new GetStudyPlanUseCase(mockRepository)
```

## 🔒 セキュリティ

- CORS設定によるオリジン制限
- 入力値のZodバリデーション
- SQL注入対策（Prisma使用）
- 型安全なAPIエンドポイント
- ESLintによるセキュリティ脆弱性チェック

## 📊 パフォーマンス

- **Hono**: 超高速ルーティング
- **Prisma**: 効率的なクエリ最適化
- **依存性注入**: シングルトンパターンでメモリ効率
- **エラーハンドリング**: グレースフルなエラー処理

## 🧪 テスト・品質管理

```bash
# テスト
npm test                 # ユニットテスト
npm run test:integration # 統合テスト
npm run test:e2e         # E2Eテスト

# コード品質チェック
npm run lint             # ESLint チェック
npm run lint:fix         # ESLint 自動修正
npm run format           # Prettier フォーマット
npm run format:check     # フォーマット確認
npm run build           # TypeScript型チェック
```

## 🌍 デプロイ

### Supabase + Vercel 推奨構成

1. **Supabase でデータベース作成**
   ```bash
   # Supabase CLI
   npx supabase init
   npx supabase start
   npx supabase db push
   ```

2. **Vercel でAPI デプロイ**
   ```bash
   # Vercel CLI
   npm install -g vercel
   vercel login
   vercel --prod
   ```

3. **環境変数設定（Vercel）**
   - `DATABASE_URL`: Supabase 接続文字列
   - `SUPABASE_URL`: Supabase プロジェクト URL
   - `SUPABASE_ANON_KEY`: Supabase 匿名キー
   - `ALLOWED_ORIGINS`: フロントエンドドメイン

### Railway（代替案）

```bash
# railway.toml
[build]
  builder = "NIXPACKS"

[deploy]
  startCommand = "npm start"
  healthcheckPath = "/"
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 8000
CMD ["npm", "start"]
```

## 🔄 今後の拡張予定

- [ ] 認証・認可システム
- [ ] WebSocket によるリアルタイム更新
- [ ] Redis キャッシュ層
- [ ] GraphQL API
- [ ] マイクロサービス分割
