# Claude PR Analysis JSON Format

## 概要
`collect-pr-data.sh`スクリプトが生成するJSON形式のデータ仕様書。Claude Codeがこのデータを解析して高品質なPR文書を生成する。

## JSON構造

### 1. メタ情報 (`meta`)
```json
{
  "meta": {
    "timestamp": "2025-08-07T12:00:00+09:00",
    "branch": "feature/claude-driven-pr-generation", 
    "commit": "a55372b1...",
    "author": "Developer Name",
    "project": "ap-study-backend"
  }
}
```

### 2. Git変更情報 (`git`)
```json
{
  "git": {
    "changed_files": [
      "src/domain/usecases/NewFeature.ts",
      "src/__tests__/new-feature.test.ts",
      "package.json"
    ],
    "file_changes": [
      {
        "file": "src/domain/usecases/NewFeature.ts",
        "additions": 150,
        "deletions": 5,
        "net_change": 145
      }
    ],
    "commits": [
      {
        "hash": "a55372b1...",
        "short_hash": "a55372b",
        "message": "feat(feature): implement new feature",
        "author": "Developer Name", 
        "date": "2025-08-07 12:00:00 +0900"
      }
    ],
    "stats": {
      "total_additions": 200,
      "total_deletions": 10, 
      "net_change": 190,
      "changed_files_count": 5
    }
  }
}
```

### 3. 品質チェック結果 (`quality_checks`)
```json
{
  "quality_checks": {
    "build": {
      "success": true,
      "message": "Build successful"
    },
    "lint": {
      "success": false,
      "warnings": 5,
      "errors": 1
    },
    "tests": {
      "success": true,
      "passed": 15,
      "failed": 0
    }
  }
}
```

### 4. プロジェクト構造情報 (`project_structure`)
```json
{
  "project_structure": {
    "typescript_files": 45,
    "test_files": 12,
    "total_lines_of_code": 3500,
    "dependencies": {
      "production": 15,
      "development": 25
    }
  }
}
```

### 5. ファイル分析 (`file_analysis`)
```json
{
  "file_analysis": {
    "categories": {
      "source_code": 3,
      "tests": 2, 
      "configuration": 1,
      "documentation": 1
    },
    "change_impact": {
      "level": "moderate",  // "minor" | "moderate" | "major"
      "domains": "API, Database, Testing"
    }
  }
}
```

## Claude解析における活用方法

### 1. 文脈理解
- **技術スタック**: TypeScript, Hono.js, Prisma等のプロジェクト特性を考慮
- **変更規模**: `stats`と`change_impact`から適切な詳細レベルを判定
- **技術領域**: `domains`からレビューポイントを特定

### 2. PR文書生成指針

#### タイトル生成
```
- change_impact.level: "major" → 詳細な機能名
- domains: "API" → "feat(api): ..."
- domains: "Database" → "feat(database): ..."
- net_change > 200 → "大規模リファクタリング"等の表現
```

#### 説明文生成
```
- file_changes: 変更ファイル別の詳細説明
- quality_checks: ビルド・テスト結果の統合
- commits: コミット履歴からの変更意図推測
- categories: 変更種別に応じた構成
```

#### レビューガイド生成
```
- domains: 技術領域別チェックポイント
- lint.warnings/errors: 注意すべきコード品質問題
- test結果: テストカバレッジと品質確認項目
```

### 3. 品質判定基準

#### エラーレベル
- `build.success: false` → 必須修正
- `lint.errors > 0` → 必須修正
- `tests.failed > 0` → 必須修正

#### 警告レベル
- `lint.warnings > 10` → 推奨修正
- `change_impact.level: "major"` → 慎重レビュー要
- `test_files == 0 && source_code > 0` → テスト追加推奨

### 4. 日本語表現ガイドライン

#### コミットメッセージパターン
- `feat` → "新機能追加", "機能実装"
- `fix` → "バグ修正", "問題解決" 
- `refactor` → "リファクタリング", "コード改善"
- `test` → "テスト追加", "テスト強化"
- `docs` → "ドキュメント更新", "文書改善"

#### 技術用語の日本語化
- API → "API", "エンドポイント"
- Database → "データベース", "DB操作"
- Authentication → "認証機能", "認証システム" 
- Testing → "テスト", "品質保証"
- Performance → "パフォーマンス", "性能"

## 使用例

### 実行コマンド
```bash
# データ収集
./scripts/collect-pr-data.sh pr-analysis.json

# Claude Code での解析・PR生成
# JSONファイルを読み込み、文脈を理解してPR作成
```

### 期待される出力品質
- **自然な日本語**: 機械的でない、読みやすい表現
- **技術的正確性**: プロジェクトの技術背景を理解した内容
- **適切な粒度**: 変更規模に応じた詳細レベル
- **実用的なガイド**: レビュアー向けの具体的チェックポイント

## 拡張予定

### フェーズ2: 高度な分析機能
- コードメトリクス統合
- セキュリティスキャン結果
- パフォーマンステスト結果
- 依存関係変更の影響分析

### フェーズ3: AI強化
- 変更パターンの学習
- プロジェクト固有の表現学習
- レビューフィードバック反映