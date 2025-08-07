#!/bin/bash

# =================================================================
# ドキュメント自動チェックスクリプト
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

log_info "ドキュメント自動チェックを開始..."

cd "$PROJECT_ROOT"

# 1. README.md存在・品質チェック
log_info "1. README.md品質チェック実行中..."

if [ -f "README.md" ]; then
    log_success "README.md: ファイルが存在します"
    
    # README.mdの基本要素チェック
    readme_issues=()
    
    # プロジェクト説明
    if ! grep -qi "# \|## " README.md; then
        readme_issues+=("見出しが不足しています")
    fi
    
    # インストール手順
    if ! grep -qi "install\|インストール\|導入" README.md; then
        readme_issues+=("インストール手順が不足している可能性があります")
    fi
    
    # 使用方法
    if ! grep -qi "usage\|使用\|実行" README.md; then
        readme_issues+=("使用方法の説明が不足している可能性があります")
    fi
    
    # API ドキュメント
    if ! grep -qi "api\|endpoint\|swagger" README.md; then
        readme_issues+=("API情報が不足している可能性があります")
    fi
    
    # 文字数チェック
    readme_length=$(wc -c < README.md)
    if [ "$readme_length" -lt 500 ]; then
        readme_issues+=("README.mdが短すぎる可能性があります ($readme_length文字)")
    fi
    
    if [ ${#readme_issues[@]} -eq 0 ]; then
        log_success "README.md: 品質は良好です"
    else
        log_warning "README.md: 改善の余地があります:"
        for issue in "${readme_issues[@]}"; do
            log_warning "  - $issue"
        done
    fi
else
    log_error "README.md: ファイルが存在しません"
fi

# 2. API ドキュメント生成・検証
log_info "2. API ドキュメント生成・検証実行中..."

# OpenAPI/Swagger設定の確認
openapi_files=$(find src -name "*.ts" -exec grep -l "swagger\|openapi\|@hono/swagger-ui" {} \; 2>/dev/null || true)

if [ -n "$openapi_files" ]; then
    log_success "API ドキュメント: OpenAPI/Swagger設定が見つかりました"
    log_info "OpenAPI関連ファイル: $openapi_files"
    
    # スキーマ定義数のチェック
    schema_count=$(grep -r "Schema.*z\.object\|export.*Schema" src/ | wc -l 2>/dev/null || echo "0")
    log_info "定義されたスキーマ数: $schema_count個"
    
    if [ "$schema_count" -gt 5 ]; then
        log_success "API ドキュメント: 十分なスキーマ定義があります"
    else
        log_warning "API ドキュメント: スキーマ定義を増やすことを推奨します"
    fi
else
    log_warning "API ドキュメント: OpenAPI/Swagger設定が見つかりません"
fi

# 3. JSDoc コメント網羅率チェック
log_info "3. JSDoc コメント網羅率チェック実行中..."

# 関数とクラスの総数カウント
total_functions=$(find src -name "*.ts" -not -path "*/node_modules/*" -exec grep -E "^export (function|class|const.*=)" {} \; | wc -l)
total_methods=$(find src -name "*.ts" -not -path "*/node_modules/*" -exec grep -E "^\s+(public|private|protected)?\s*(async\s+)?\w+\s*\(" {} \; | wc -l)

# JSDocコメントの数カウント
jsdoc_comments=$(find src -name "*.ts" -not -path "*/node_modules/*" -exec grep -E "/\*\*" {} \; | wc -l)

total_declarations=$((total_functions + total_methods))
log_info "コメント統計:"
log_info "  - 関数・クラス数: $total_functions"
log_info "  - メソッド数: $total_methods"
log_info "  - JSDocコメント数: $jsdoc_comments"

if [ "$total_declarations" -gt 0 ]; then
    comment_coverage=$(echo "scale=2; $jsdoc_comments * 100 / $total_declarations" | bc -l 2>/dev/null || echo "0")
    log_info "  - コメント網羅率: ${comment_coverage}%"
    
    if (( $(echo "$comment_coverage > 50" | bc -l 2>/dev/null || echo 0) )); then
        log_success "JSDoc コメント網羅率: 良好です (> 50%)"
    else
        log_warning "JSDoc コメント網羅率: 改善を推奨します (< 50%)"
    fi
fi

# 4. 型定義ドキュメント確認
log_info "4. 型定義ドキュメント確認実行中..."

# TypeScript型定義の確認
type_exports=$(find src -name "*.ts" -not -path "*/node_modules/*" -exec grep -E "^export (type|interface)" {} \; | wc -l)
log_info "エクスポートされた型定義数: $type_exports個"

# 型定義ファイルの確認
type_files=$(find src -name "*.ts" | grep -E "(type|interface|schema)" | wc -l 2>/dev/null || echo "0")
log_info "型定義関連ファイル数: $type_files個"

if [ "$type_exports" -gt 10 ] || [ "$type_files" -gt 3 ]; then
    log_success "型定義ドキュメント: 充実しています"
else
    log_warning "型定義ドキュメント: 型定義を充実させることを推奨します"
fi

# 5. チェンジログ・バージョン管理確認
log_info "5. チェンジログ・バージョン管理確認実行中..."

changelog_files=$(find . -maxdepth 1 -iname "changelog*" -o -iname "history*" -o -iname "releases*" 2>/dev/null || true)

if [ -n "$changelog_files" ]; then
    log_success "チェンジログ: ファイルが存在します ($changelog_files)"
else
    log_warning "チェンジログ: CHANGELOGファイルの作成を推奨します"
fi

# package.jsonのバージョン確認
if [ -f "package.json" ]; then
    version=$(grep -o '"version":\s*"[^"]*"' package.json | cut -d'"' -f4)
    log_info "現在のバージョン: $version"
    
    if [ -n "$version" ] && [ "$version" != "1.0.0" ]; then
        log_success "バージョン管理: 適切にバージョニングされています"
    else
        log_warning "バージョン管理: バージョンの更新を検討してください"
    fi
fi

# 6. ライセンス情報確認
log_info "6. ライセンス情報確認実行中..."

license_files=$(find . -maxdepth 1 -iname "license*" -o -iname "copying*" 2>/dev/null || true)

if [ -n "$license_files" ]; then
    log_success "ライセンス: ライセンスファイルが存在します ($license_files)"
else
    log_warning "ライセンス: LICENSEファイルの追加を推奨します"
fi

# package.jsonのlicense フィールド確認
if [ -f "package.json" ]; then
    license_field=$(grep -o '"license":\s*"[^"]*"' package.json | cut -d'"' -f4 2>/dev/null || echo "")
    if [ -n "$license_field" ] && [ "$license_field" != "ISC" ]; then
        log_info "ライセンス情報: $license_field"
        log_success "ライセンス: package.jsonに適切に記載されています"
    else
        log_warning "ライセンス: package.jsonのライセンス情報を更新することを推奨します"
    fi
fi

# 7. 開発者向けドキュメント確認
log_info "7. 開発者向けドキュメント確認実行中..."

dev_docs=()
[ -f "CONTRIBUTING.md" ] && dev_docs+=("CONTRIBUTING.md")
[ -f "DEVELOPMENT.md" ] && dev_docs+=("DEVELOPMENT.md")
[ -f "docs/development" ] && dev_docs+=("docs/development/")
[ -f "docs/api" ] && dev_docs+=("docs/api/")

if [ ${#dev_docs[@]} -gt 0 ]; then
    log_success "開発者向けドキュメント: 以下のファイルが存在します:"
    for doc in "${dev_docs[@]}"; do
        log_info "  - $doc"
    done
else
    log_warning "開発者向けドキュメント: CONTRIBUTING.mdや開発ガイドの追加を推奨します"
fi

# 8. ドキュメントのリンク切れチェック（簡易版）
log_info "8. ドキュメントのリンク切れチェック実行中..."

if [ -f "README.md" ]; then
    # HTTPSリンクを抽出
    links=$(grep -oE 'https?://[^)]*' README.md 2>/dev/null || true)
    link_count=$(echo "$links" | wc -l)
    
    if [ -n "$links" ]; then
        log_info "README.mdに $link_count 個のリンクが見つかりました"
        # 簡易的にリンクの形式チェック
        invalid_links=$(echo "$links" | grep -v -E '^https?://.+\..+' || true)
        if [ -n "$invalid_links" ]; then
            log_warning "無効な形式のリンクが見つかりました:"
            echo "$invalid_links"
        else
            log_success "リンク形式: 適切です"
        fi
    else
        log_info "README.mdにはHTTPリンクが含まれていません"
    fi
fi

log_success "ドキュメント自動チェック完了！"