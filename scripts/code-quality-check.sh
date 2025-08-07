#!/bin/bash

# =================================================================
# コード品質強化チェックスクリプト
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

# 品質閾値設定
MIN_COVERAGE_PERCENT=80
MAX_COMPLEXITY=10
MIN_MAINTAINABILITY_INDEX=70

log_info "コード品質強化チェックを開始..."

cd "$PROJECT_ROOT"

# 1. テストカバレッジ測定
log_info "1. テストカバレッジ測定実行中..."

# Vitestでカバレッジレポート生成
if npm test -- --coverage --reporter=verbose 2>/dev/null; then
    log_success "テストカバレッジ: 測定完了"
    
    # カバレッジファイルが生成されているかチェック
    if [ -f "coverage/coverage-summary.json" ]; then
        # JSONからカバレッジパーセンテージを抽出（簡易版）
        coverage_info=$(cat coverage/coverage-summary.json 2>/dev/null || echo "{}")
        log_info "カバレッジレポートが生成されました"
        
        # カバレッジディレクトリの内容確認
        if [ -d "coverage" ]; then
            coverage_files=$(ls coverage/ 2>/dev/null || echo "なし")
            log_info "カバレッジファイル: $coverage_files"
        fi
    else
        log_warning "カバレッジレポートファイルが見つかりません"
    fi
else
    log_warning "テストカバレッジ: 測定に失敗しました（テストが実行できない可能性があります）"
fi

# 2. 循環複雑度チェック（ESLintベース）
log_info "2. 循環複雑度チェック実行中..."

# ESLint complexity ruleの結果を確認
complexity_report_file="/tmp/complexity-report.txt"
if npm run lint -- --format=json > "$complexity_report_file" 2>/dev/null; then
    
    # complexityエラーを抽出
    complexity_violations=$(grep -o '"ruleId":"complexity"' "$complexity_report_file" | wc -l 2>/dev/null || echo "0")
    
    if [ "$complexity_violations" -eq 0 ]; then
        log_success "循環複雑度: すべての関数が閾値内です (< $MAX_COMPLEXITY)"
    else
        log_warning "循環複雑度: $complexity_violations個の関数が閾値を超えています (> $MAX_COMPLEXITY)"
    fi
else
    log_warning "循環複雑度: ESLintレポートの生成に失敗しました"
fi

rm -f "$complexity_report_file"

# 3. デッドコード検出
log_info "3. デッドコード検出実行中..."

dead_code_file="/tmp/dead-code.txt"

# 未使用のimport/exportを検索
find src -name "*.ts" -not -path "*/node_modules/*" | while read file; do
    # 未使用のimportを検索（簡易版）
    unused_imports=$(grep -E "^import.*{.*}" "$file" 2>/dev/null | head -5 || true)
    if [ -n "$unused_imports" ]; then
        echo "File: $file"
        echo "$unused_imports"
        echo "---"
    fi
done > "$dead_code_file"

# 未使用の関数/変数を検索（簡易版）
unused_functions_file="/tmp/unused-functions.txt"
find src -name "*.ts" -not -path "*/node_modules/*" | while read file; do
    # exportされているが他のファイルで使用されていない関数を検索
    exports=$(grep -E "^export (function|const|class)" "$file" 2>/dev/null | cut -d' ' -f3 | cut -d'(' -f1 || true)
    for export in $exports; do
        if [ -n "$export" ]; then
            # 他のファイルでの使用をチェック
            usage_count=$(find src -name "*.ts" -not -path "$file" -exec grep -l "$export" {} \; 2>/dev/null | wc -l)
            if [ "$usage_count" -eq 0 ]; then
                echo "未使用の可能性: $export in $file"
            fi
        fi
    done
done > "$unused_functions_file"

if [ -s "$unused_functions_file" ]; then
    log_warning "デッドコード検出: 未使用の可能性がある関数が見つかりました:"
    head -10 "$unused_functions_file"
else
    log_success "デッドコード検出: 明らかに未使用の関数は見つかりませんでした"
fi

rm -f "$dead_code_file" "$unused_functions_file"

# 4. 重複コード検出
log_info "4. 重複コード検出実行中..."

# 同じような行の検索（簡易版）
duplicate_lines_file="/tmp/duplicate-lines.txt"
find src -name "*.ts" -not -path "*/node_modules/*" -exec grep -h -v "^$\|^/\*\|^\*\|^//\|^\s*import\|^\s*export" {} \; | \
    sort | uniq -c | sort -nr | head -20 > "$duplicate_lines_file"

duplicate_count=$(awk '$1 > 1' "$duplicate_lines_file" | wc -l)
if [ "$duplicate_count" -gt 0 ]; then
    log_warning "重複コード検出: $duplicate_count個の重複する可能性がある行が見つかりました"
    log_info "重複度の高い行 (上位5):"
    head -5 "$duplicate_lines_file" | while read count line; do
        if [ "$count" -gt 1 ]; then
            echo "  $count回: $line"
        fi
    done
else
    log_success "重複コード検出: 重複は検出されませんでした"
fi

rm -f "$duplicate_lines_file"

# 5. TypeScript厳格性チェック
log_info "5. TypeScript厳格性チェック実行中..."

# tsconfig.jsonの厳格設定をチェック
tsconfig_file="tsconfig.json"
if [ -f "$tsconfig_file" ]; then
    strict_mode=$(grep -o '"strict":\s*true' "$tsconfig_file" || echo "")
    no_any=$(grep -o '"noImplicitAny":\s*true' "$tsconfig_file" || echo "")
    no_unused_locals=$(grep -o '"noUnusedLocals":\s*true' "$tsconfig_file" || echo "")
    
    strict_count=0
    [ -n "$strict_mode" ] && strict_count=$((strict_count + 1))
    [ -n "$no_any" ] && strict_count=$((strict_count + 1))
    [ -n "$no_unused_locals" ] && strict_count=$((strict_count + 1))
    
    if [ "$strict_count" -ge 2 ]; then
        log_success "TypeScript厳格性: 適切な厳格設定が有効です"
    else
        log_warning "TypeScript厳格性: より厳格な設定を推奨します"
        log_info "推奨設定: strict: true, noImplicitAny: true, noUnusedLocals: true"
    fi
else
    log_error "tsconfig.jsonが見つかりません"
fi

# 6. コードメトリクス算出
log_info "6. コードメトリクス算出実行中..."

# ファイル数とコード行数統計
total_files=$(find src -name "*.ts" -not -path "*/node_modules/*" | wc -l)
total_lines=$(find src -name "*.ts" -not -path "*/node_modules/*" -exec cat {} \; | wc -l)
code_lines=$(find src -name "*.ts" -not -path "*/node_modules/*" -exec grep -v "^$\|^/\*\|^\*\|^//" {} \; | wc -l)
comment_lines=$(find src -name "*.ts" -not -path "*/node_modules/*" -exec grep -E "^/\*\|^\*\|^//" {} \; | wc -l)

log_info "コードメトリクス:"
log_info "  - 総ファイル数: $total_files"
log_info "  - 総行数: $total_lines"
log_info "  - コード行数: $code_lines"
log_info "  - コメント行数: $comment_lines"

if [ "$total_lines" -gt 0 ]; then
    comment_ratio=$(echo "scale=2; $comment_lines * 100 / $total_lines" | bc -l 2>/dev/null || echo "0")
    log_info "  - コメント率: ${comment_ratio}%"
    
    if (( $(echo "$comment_ratio > 10" | bc -l 2>/dev/null || echo 0) )); then
        log_success "コメント率: 適切です (> 10%)"
    else
        log_warning "コメント率: コメントを増やすことを推奨します (< 10%)"
    fi
fi

# 7. ESLint警告数集計
log_info "7. ESLint警告数集計実行中..."

eslint_output_file="/tmp/eslint-output.txt"
if npm run lint > "$eslint_output_file" 2>&1; then
    log_success "ESLint: エラーはありません"
else
    warning_count=$(grep -c "warning" "$eslint_output_file" 2>/dev/null || echo "0")
    error_count=$(grep -c "error" "$eslint_output_file" 2>/dev/null || echo "0")
    
    log_info "ESLint結果:"
    log_info "  - エラー数: $error_count"
    log_info "  - 警告数: $warning_count"
    
    if [ "$error_count" -eq 0 ] && [ "$warning_count" -lt 20 ]; then
        log_success "ESLint: 品質は良好です"
    elif [ "$error_count" -eq 0 ]; then
        log_warning "ESLint: 警告が多めです ($warning_count個)"
    else
        log_error "ESLint: エラーがあります ($error_count個)"
    fi
fi

rm -f "$eslint_output_file"

log_success "コード品質強化チェック完了！"