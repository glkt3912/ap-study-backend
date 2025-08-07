#!/bin/bash

# =================================================================
# PR データ収集スクリプト - Claude解析用データ生成
# =================================================================

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() { echo -e "${BLUE}ℹ️  $1${NC}" >&2; }
log_success() { echo -e "${GREEN}✅ $1${NC}" >&2; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}" >&2; }
log_error() { echo -e "${RED}❌ $1${NC}" >&2; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 出力先ファイル
OUTPUT_FILE="${1:-pr-analysis.json}"

log_info "PRデータ収集を開始... (出力: $OUTPUT_FILE)"

cd "$PROJECT_ROOT"

# JSON出力開始
echo "{" > "$OUTPUT_FILE"

# 1. 基本情報収集
log_info "基本情報を収集中..."
cat >> "$OUTPUT_FILE" << EOF
  "meta": {
    "timestamp": "$(date -Iseconds)",
    "branch": "$(git rev-parse --abbrev-ref HEAD)",
    "commit": "$(git rev-parse HEAD)",
    "author": "$(git config user.name)",
    "project": "$(basename "$PROJECT_ROOT")"
  },
EOF

# 2. Git変更情報収集
log_info "Git変更情報を収集中..."
cat >> "$OUTPUT_FILE" << 'EOF'
  "git": {
EOF

# 変更されたファイル一覧
echo '    "changed_files": [' >> "$OUTPUT_FILE"
git diff --name-only HEAD~1 | while IFS= read -r file; do
    if [ -n "$file" ]; then
        echo "      \"$file\"," >> "$OUTPUT_FILE"
    fi
done
# 最後のカンマを削除
if grep -q ',' "$OUTPUT_FILE"; then
    sed -i '$ s/,$//' "$OUTPUT_FILE"
fi
echo '    ],' >> "$OUTPUT_FILE"

# ファイル別変更統計
echo '    "file_changes": [' >> "$OUTPUT_FILE"
git diff --numstat HEAD~1 | while read additions deletions filename; do
    if [ -n "$filename" ]; then
        cat >> "$OUTPUT_FILE" << EOF
      {
        "file": "$filename",
        "additions": $additions,
        "deletions": $deletions,
        "net_change": $((additions - deletions))
      },
EOF
    fi
done
# 最後のカンマを削除
if grep -q ',' "$OUTPUT_FILE"; then
    sed -i '$ s/,$//' "$OUTPUT_FILE"
fi
echo '    ],' >> "$OUTPUT_FILE"

# コミット履歴
echo '    "commits": [' >> "$OUTPUT_FILE"
git log --oneline -10 --format='{"hash": "%H", "short_hash": "%h", "message": "%s", "author": "%an", "date": "%ai"}' | sed 's/$/,/' >> "$OUTPUT_FILE"
# 最後のカンマを削除
if grep -q ',' "$OUTPUT_FILE"; then
    sed -i '$ s/,$//' "$OUTPUT_FILE"
fi
echo '    ],' >> "$OUTPUT_FILE"

# 変更差分サマリー
total_additions=$(git diff --numstat HEAD~1 | awk '{sum+=$1} END {print sum+0}')
total_deletions=$(git diff --numstat HEAD~1 | awk '{sum+=$2} END {print sum+0}')
changed_files_count=$(git diff --name-only HEAD~1 | wc -l)

cat >> "$OUTPUT_FILE" << EOF
    "stats": {
      "total_additions": $total_additions,
      "total_deletions": $total_deletions,
      "net_change": $((total_additions - total_deletions)),
      "changed_files_count": $changed_files_count
    }
  },
EOF

# 3. 品質チェック結果収集
log_info "品質チェック結果を収集中..."
cat >> "$OUTPUT_FILE" << 'EOF'
  "quality_checks": {
EOF

# TypeScript/Build チェック
echo '    "build": {' >> "$OUTPUT_FILE"
if npm run build > /tmp/build.log 2>&1; then
    echo '      "success": true,' >> "$OUTPUT_FILE"
    echo '      "message": "Build successful"' >> "$OUTPUT_FILE"
else
    echo '      "success": false,' >> "$OUTPUT_FILE"
    build_error=$(head -10 /tmp/build.log | sed 's/"/\\"/g' | tr '\n' ' ')
    echo "      \"message\": \"Build failed: $build_error\"" >> "$OUTPUT_FILE"
fi
echo '    },' >> "$OUTPUT_FILE"

# Lint チェック
echo '    "lint": {' >> "$OUTPUT_FILE"
if npm run lint > /tmp/lint.log 2>&1; then
    echo '      "success": true,' >> "$OUTPUT_FILE"
    echo '      "warnings": 0,' >> "$OUTPUT_FILE"
    echo '      "errors": 0' >> "$OUTPUT_FILE"
else
    lint_warnings=$(grep -c "warning" /tmp/lint.log 2>/dev/null || echo "0")
    lint_errors=$(grep -c "error" /tmp/lint.log 2>/dev/null || echo "0")
    echo "      \"success\": false," >> "$OUTPUT_FILE"
    echo "      \"warnings\": $lint_warnings," >> "$OUTPUT_FILE"
    echo "      \"errors\": $lint_errors" >> "$OUTPUT_FILE"
fi
echo '    },' >> "$OUTPUT_FILE"

# Test実行結果
echo '    "tests": {' >> "$OUTPUT_FILE"
if npm test > /tmp/test.log 2>&1; then
    echo '      "success": true,' >> "$OUTPUT_FILE"
    test_passed=$(grep -o "[0-9]* passed" /tmp/test.log | head -1 | grep -o "[0-9]*" || echo "0")
    echo "      \"passed\": $test_passed," >> "$OUTPUT_FILE"
    echo '      "failed": 0' >> "$OUTPUT_FILE"
else
    test_failed=$(grep -o "[0-9]* failed" /tmp/test.log | head -1 | grep -o "[0-9]*" || echo "1")
    test_passed=$(grep -o "[0-9]* passed" /tmp/test.log | head -1 | grep -o "[0-9]*" || echo "0")
    echo '      "success": false,' >> "$OUTPUT_FILE"
    echo "      \"passed\": $test_passed," >> "$OUTPUT_FILE"
    echo "      \"failed\": $test_failed" >> "$OUTPUT_FILE"
fi
echo '    }' >> "$OUTPUT_FILE"

echo '  },' >> "$OUTPUT_FILE"

# 4. プロジェクト構造情報
log_info "プロジェクト構造を分析中..."
cat >> "$OUTPUT_FILE" << 'EOF'
  "project_structure": {
EOF

# ファイル統計
ts_files=$(find src -name "*.ts" | wc -l)
test_files=$(find src -name "*.test.ts" -o -name "*.spec.ts" | wc -l)
total_loc=$(find src -name "*.ts" -exec cat {} \; | wc -l)

cat >> "$OUTPUT_FILE" << EOF
    "typescript_files": $ts_files,
    "test_files": $test_files,
    "total_lines_of_code": $total_loc,
EOF

# 依存関係情報
echo '    "dependencies": {' >> "$OUTPUT_FILE"
prod_deps=$(grep -c '"[^"]*":' package.json | head -1 || echo "0")
dev_deps=$(grep -A 100 '"devDependencies"' package.json | grep -c '"[^"]*":' || echo "0")
echo "      \"production\": $prod_deps," >> "$OUTPUT_FILE"
echo "      \"development\": $dev_deps" >> "$OUTPUT_FILE"
echo '    }' >> "$OUTPUT_FILE"

echo '  },' >> "$OUTPUT_FILE"

# 5. ファイル種別分析
log_info "変更ファイル種別を分析中..."
cat >> "$OUTPUT_FILE" << 'EOF'
  "file_analysis": {
    "categories": {
EOF

# ファイルカテゴリ分析
src_files=$(git diff --name-only HEAD~1 | grep "^src/" | grep -v test | wc -l || echo "0")
test_files_changed=$(git diff --name-only HEAD~1 | grep -E "test|spec" | wc -l || echo "0")
config_files=$(git diff --name-only HEAD~1 | grep -E "\.(json|js|ts|yaml|yml)$" | grep -v "src/" | wc -l || echo "0")
doc_files=$(git diff --name-only HEAD~1 | grep -E "\.(md|txt)$" | wc -l || echo "0")

cat >> "$OUTPUT_FILE" << EOF
      "source_code": $src_files,
      "tests": $test_files_changed,
      "configuration": $config_files,
      "documentation": $doc_files
    },
EOF

# 変更の重要度判定
echo '    "change_impact": {' >> "$OUTPUT_FILE"
if [ $src_files -gt 5 ] || [ $total_additions -gt 200 ]; then
    echo '      "level": "major",' >> "$OUTPUT_FILE"
elif [ $src_files -gt 2 ] || [ $total_additions -gt 50 ]; then
    echo '      "level": "moderate",' >> "$OUTPUT_FILE"
else
    echo '      "level": "minor",' >> "$OUTPUT_FILE"
fi

# 技術領域の特定
domains=""
if git diff --name-only HEAD~1 | grep -q "routes\|api"; then domains="$domains API,"; fi
if git diff --name-only HEAD~1 | grep -q "database\|prisma\|schema"; then domains="$domains Database,"; fi
if git diff --name-only HEAD~1 | grep -q "auth"; then domains="$domains Authentication,"; fi
if git diff --name-only HEAD~1 | grep -q "test"; then domains="$domains Testing,"; fi
if git diff --name-only HEAD~1 | grep -q "middleware"; then domains="$domains Middleware,"; fi

# 最後のカンマを削除
domains=$(echo "$domains" | sed 's/,$//')
echo "      \"domains\": \"$domains\"" >> "$OUTPUT_FILE"
echo '    }' >> "$OUTPUT_FILE"

echo '  }' >> "$OUTPUT_FILE"

# JSON終了
echo "}" >> "$OUTPUT_FILE"

# 一時ファイルクリーンアップ
rm -f /tmp/build.log /tmp/lint.log /tmp/test.log

log_success "PRデータ収集完了: $OUTPUT_FILE"

# Claude向けの簡潔な使用説明をファイル末尾にコメントとして追加
cat >> "$OUTPUT_FILE" << 'EOF'

# Claude Code向け使用ガイド:
# 1. このJSONファイルを読み込み、プロジェクトの文脈を理解
# 2. 変更内容の意図と技術的背景を分析
# 3. 適切な日本語・英語でPRタイトル・説明文を生成
# 4. レビューポイントと品質チェック結果を統合した包括的な内容を作成
EOF

log_info "Claude Code解析の準備が完了しました"