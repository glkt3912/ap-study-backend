#!/bin/bash

# =================================================================
# API品質チェックスクリプト
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

log_info "API品質チェックを開始..."

cd "$PROJECT_ROOT"

# 1. OpenAPIスキーマ定義の完全性チェック
log_info "1. OpenAPIスキーマ定義完全性チェック実行中..."

OPENAPI_FILE="src/infrastructure/web/openapi.ts"
if [ -f "$OPENAPI_FILE" ]; then
    # スキーマ定義の存在確認
    if grep -q "ApiResponseSchema\|ErrorResponseSchema" "$OPENAPI_FILE"; then
        log_success "OpenAPIスキーマ: 基本レスポンススキーマが定義されています"
    else
        log_error "OpenAPIスキーマ: 基本レスポンススキーマが見つかりません"
        exit 1
    fi
    
    # Zodスキーマ数をカウント
    schema_count=$(grep -c "Schema.*z\.object" "$OPENAPI_FILE" 2>/dev/null || echo "0")
    log_info "定義されたスキーマ数: $schema_count個"
    
    if [ "$schema_count" -gt 5 ]; then
        log_success "OpenAPIスキーマ: 十分なスキーマ定義があります"
    else
        log_warning "OpenAPIスキーマ: スキーマ定義が少ない可能性があります ($schema_count個)"
    fi
else
    log_error "OpenAPIファイルが見つかりません: $OPENAPI_FILE"
    exit 1
fi

# 2. エンドポイント命名規約チェック
log_info "2. エンドポイント命名規約チェック実行中..."

ROUTES_DIR="src/infrastructure/web/routes"
if [ -d "$ROUTES_DIR" ]; then
    # REST命名規約チェック
    inconsistent_endpoints=()
    
    for route_file in "$ROUTES_DIR"/*.ts; do
        if [ -f "$route_file" ]; then
            # 非RESTfulなエンドポイント検出
            if grep -E "\.get.*[A-Z]|\.post.*[A-Z]|\.put.*[A-Z]|\.delete.*[A-Z]" "$route_file" 2>/dev/null; then
                inconsistent_endpoints+=("$route_file")
            fi
        fi
    done
    
    if [ ${#inconsistent_endpoints[@]} -eq 0 ]; then
        log_success "エンドポイント命名規約: RESTful命名規約に準拠しています"
    else
        log_warning "エンドポイント命名規約: 以下のファイルで大文字が検出されました:"
        for file in "${inconsistent_endpoints[@]}"; do
            log_warning "  - $file"
        done
    fi
    
    # HTTPメソッドの適切な使用チェック
    route_files=$(find "$ROUTES_DIR" -name "*.ts")
    method_count=$(grep -h -E "\.(get|post|put|delete|patch)" $route_files 2>/dev/null | wc -l)
    log_info "定義されたエンドポイント数: $method_count個"
    
else
    log_error "ルートディレクトリが見つかりません: $ROUTES_DIR"
    exit 1
fi

# 3. レスポンス形式の一貫性チェック
log_info "3. レスポンス形式一貫性チェック実行中..."

# 標準化されたレスポンス形式の使用確認
inconsistent_responses=()

for route_file in "$ROUTES_DIR"/*.ts; do
    if [ -f "$route_file" ]; then
        # 非標準的なレスポンス形式を検出
        if grep -E "return.*[^{].*[^}]$" "$route_file" | grep -v "success\|error\|data" 2>/dev/null; then
            inconsistent_responses+=("$route_file")
        fi
    fi
done

if [ ${#inconsistent_responses[@]} -eq 0 ]; then
    log_success "レスポンス形式: 標準化されたレスポンス形式を使用しています"
else
    log_warning "レスポンス形式: 以下のファイルで非標準レスポンスが検出される可能性があります:"
    for file in "${inconsistent_responses[@]}"; do
        log_warning "  - $file"
    done
fi

# 4. エラーハンドリング網羅性チェック
log_info "4. エラーハンドリング網羅性チェック実行中..."

error_handling_issues=()

for route_file in "$ROUTES_DIR"/*.ts; do
    if [ -f "$route_file" ]; then
        # try-catchブロックの存在確認
        if ! grep -q "try.*catch\|\.catch(" "$route_file" 2>/dev/null; then
            error_handling_issues+=("$route_file")
        fi
    fi
done

if [ ${#error_handling_issues[@]} -eq 0 ]; then
    log_success "エラーハンドリング: 適切なエラーハンドリングが実装されています"
else
    log_warning "エラーハンドリング: 以下のファイルでエラーハンドリングが不足している可能性があります:"
    for file in "${error_handling_issues[@]}"; do
        log_warning "  - $file"
    done
fi

# 5. HTTPステータスコードの適切な使用チェック
log_info "5. HTTPステータスコード使用チェック実行中..."

status_code_usage=()

for route_file in "$ROUTES_DIR"/*.ts; do
    if [ -f "$route_file" ]; then
        # ステータスコードの使用確認
        if grep -E "\.status\([0-9]+\)|c\.status\([0-9]+\)" "$route_file" 2>/dev/null; then
            status_codes=$(grep -oE "\.status\([0-9]+\)|c\.status\([0-9]+\)" "$route_file" | grep -oE "[0-9]+" | sort | uniq)
            log_info "$(basename "$route_file"): ステータスコード使用 - $status_codes"
        fi
    fi
done

log_success "HTTPステータスコード: チェック完了"

# 6. API バージョニング確認
log_info "6. API バージョニング確認実行中..."

if grep -r "v[0-9]\|version" "$ROUTES_DIR" 2>/dev/null; then
    log_success "API バージョニング: バージョニング戦略が実装されています"
else
    log_warning "API バージョニング: バージョニング戦略が見当たりません"
fi

# 7. CORS設定確認（再チェック）
log_info "7. CORS設定確認実行中..."

cors_config_files=$(find src/ -name "*.ts" -exec grep -l "cors\|CORS" {} \;)
if [ -n "$cors_config_files" ]; then
    log_success "CORS設定: CORS設定ファイルが見つかりました"
    echo "CORS設定ファイル: $cors_config_files"
else
    log_warning "CORS設定: CORS設定が見当たりません"
fi

# 8. API ドキュメント存在確認
log_info "8. API ドキュメント存在確認実行中..."

if grep -q "swagger\|openapi" "$OPENAPI_FILE" 2>/dev/null; then
    log_success "API ドキュメント: Swagger/OpenAPI ドキュメントが設定されています"
else
    log_warning "API ドキュメント: Swagger/OpenAPI ドキュメントが設定されていません"
fi

log_success "API品質チェック完了！"