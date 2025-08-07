#!/bin/bash

# =================================================================
# Claude主導PR生成スクリプト
# =================================================================

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 引数処理
PR_THEME="${1:-"機能改善"}"
OUTPUT_MODE="${2:-"interactive"}"  # interactive | auto | dry-run

log_info "🤖 Claude主導PR生成システム開始"
log_info "テーマ: $PR_THEME"
log_info "モード: $OUTPUT_MODE"

cd "$PROJECT_ROOT"

# 1. データ収集実行
log_info "📊 PRデータ収集中..."
if ! ./scripts/collect-pr-data.sh /tmp/pr-analysis.json; then
    log_error "データ収集に失敗しました"
    exit 1
fi

log_success "データ収集完了"

# 2. JSON データの検証
if [ ! -f "/tmp/pr-analysis.json" ]; then
    log_error "PR分析データファイルが見つかりません"
    exit 1
fi

# 3. Claude Code向けガイダンス生成
log_info "🧠 Claude Code解析ガイダンス準備中..."

# Claude向けの解析プロンプトを生成
cat > /tmp/claude-pr-prompt.md << EOF
# Claude Code PR生成リクエスト

## 🎯 タスク概要
以下のJSON分析データを基に、プロジェクトの文脈を理解して高品質なPR文書を生成してください。

## 📋 要求仕様

### PR文書生成内容
1. **PRタイトル** (日本語 + 英語Conventional Commits)
2. **PR説明文** (markdown形式、日本語メイン)
3. **レビューガイド** (レビュアー向けチェックポイント)
4. **品質チェック結果統合** (ビルド・テスト・Lint結果の解釈)

### 品質基準
- ✅ **自然な日本語**: 機械的でない、読みやすい表現
- ✅ **技術的正確性**: プロジェクトの技術背景を理解
- ✅ **適切な粒度**: 変更規模に応じた詳細レベル
- ✅ **実用性**: 実際のコードレビューで活用できる内容

### 技術コンテキスト
- **プロジェクト**: 応用情報技術者試験 学習管理システム バックエンド
- **技術スタック**: Node.js 22, TypeScript, Hono.js, Prisma, PostgreSQL
- **アーキテクチャ**: クリーンアーキテクチャ
- **開発手法**: TDD (Test-Driven Development)

## 📊 分析対象データ
\`\`\`json
$(cat /tmp/pr-analysis.json)
\`\`\`

## 🎨 出力フォーマット

### 1. PRタイトル
\`\`\`
日本語タイトル例: "学習効率分析機能の拡充"  
英語コミット例: "feat(analysis): enhance learning efficiency analysis features"
\`\`\`

### 2. PR説明文 (markdown)
\`\`\`markdown
## Summary
[変更概要を3-5行で要約]

## 🔧 実装内容
### 主な変更点
- [変更点1: 具体的な機能追加]
- [変更点2: 技術的改善]
- [変更点3: その他の変更]

### 技術的詳細  
- [実装方法や技術選択の理由]
- [パフォーマンス・セキュリティ考慮点]

## 📋 品質チェック結果
[ビルド・テスト・Lint結果の統合と解釈]

## 🧪 Test plan
- [ ] [テスト項目1]
- [ ] [テスト項目2]

## 🔍 Review focus
### 優先レビューポイント
1. **[技術領域1]**: [具体的チェックポイント]
2. **[技術領域2]**: [具体的チェックポイント]

### 注意事項
- [レビュー時の注意点]

## Breaking changes
[破壊的変更の有無と影響]
\`\`\`

## 🚀 生成指示
上記の分析データとフォーマットに基づいて、実際のプロジェクトで使用できる高品質なPR文書を生成してください。変更内容の意図を理解し、技術的背景を考慮した自然で説得力のある文書作成をお願いします。

---
**重要**: スクリプトやテンプレート的な表現ではなく、この特定の変更に対する具体的で実用的な内容を生成してください。
EOF

log_success "Claude Code解析ガイダンス準備完了"

# 4. 実行モード別処理
case "$OUTPUT_MODE" in
    "interactive")
        log_info "🔄 対話的モードで実行します"
        echo ""
        echo "=============================================="
        echo "🤖 Claude Code PR生成 - 対話的モード"
        echo "=============================================="
        echo ""
        echo "📁 以下のファイルが準備されました:"
        echo "  - 分析データ: /tmp/pr-analysis.json"
        echo "  - 解析ガイド: /tmp/claude-pr-prompt.md"
        echo ""
        echo "👨‍💻 次の手順でPRを生成してください:"
        echo ""
        echo "1. 以下のコマンドでClaude Codeに解析ガイドを提供:"
        echo "   Claude Code: /tmp/claude-pr-prompt.md の内容を確認してください"
        echo ""
        echo "2. Claude CodeがPR文書を生成"
        echo ""  
        echo "3. 生成された内容をレビューして調整"
        echo ""
        echo "4. PRを作成:"
        echo "   gh pr create --title \"[生成されたタイトル]\" --body \"[生成された説明文]\""
        echo ""
        ;;
        
    "dry-run")
        log_info "🧪 ドライランモードで実行します"
        echo ""
        echo "=============================================="
        echo "📋 PR生成予定内容 (ドライラン)"
        echo "=============================================="
        echo ""
        echo "📊 収集されたデータ:"
        branch=$(cat /tmp/pr-analysis.json | grep -o '"branch": "[^"]*"' | cut -d'"' -f4)
        files_count=$(cat /tmp/pr-analysis.json | grep -o '"changed_files_count": [0-9]*' | grep -o '[0-9]*')
        total_additions=$(cat /tmp/pr-analysis.json | grep -o '"total_additions": [0-9]*' | grep -o '[0-9]*')
        
        echo "  - ブランチ: $branch"
        echo "  - 変更ファイル数: $files_count"
        echo "  - 追加行数: $total_additions"
        echo ""
        echo "📝 Claude Code解析用ファイル準備完了:"
        echo "  - /tmp/pr-analysis.json ($(wc -l < /tmp/pr-analysis.json)行)"
        echo "  - /tmp/claude-pr-prompt.md ($(wc -l < /tmp/claude-pr-prompt.md)行)"
        echo ""
        echo "⚡ 実際の実行には '--mode interactive' または '--mode auto' を使用してください"
        ;;
        
    "auto")
        log_warning "🚧 自動モードは開発中です"
        echo "現在は対話的モード (interactive) のみサポートしています"
        echo "将来のバージョンでClaude API連携による完全自動化を予定"
        ;;
        
    *)
        log_error "無効なモード: $OUTPUT_MODE"
        echo "使用可能なモード: interactive, auto, dry-run"
        exit 1
        ;;
esac

# 5. クリーンアップ設定
if [ "$OUTPUT_MODE" != "interactive" ]; then
    log_info "🧹 一時ファイルをクリーンアップします"
    echo "一時ファイルを保持するには Ctrl+C で中断してください..."
    sleep 3
    rm -f /tmp/pr-analysis.json /tmp/claude-pr-prompt.md
    log_success "クリーンアップ完了"
else
    log_info "💾 Claude Code作業用ファイルを保持しています:"
    echo "  - /tmp/pr-analysis.json"
    echo "  - /tmp/claude-pr-prompt.md"
    echo ""
    echo "作業完了後は手動でクリーンアップしてください"
fi

log_success "🎉 Claude主導PR生成システム処理完了"