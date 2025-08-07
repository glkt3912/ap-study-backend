#!/bin/bash

# =================================================================
# セキュリティチェックスクリプト
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

log_info "セキュリティチェックを開始..."

# 1. npm auditセキュリティスキャン
log_info "1. npm auditセキュリティスキャン実行中..."
cd "$PROJECT_ROOT"

if npm audit --audit-level moderate; then
    log_success "npm audit: セキュリティ脆弱性は検出されませんでした"
else
    log_error "npm audit: セキュリティ脆弱性が検出されました。修正が必要です。"
    exit 1
fi

# 2. 機密情報漏洩チェック
log_info "2. 機密情報漏洩チェック実行中..."

# 検出パターン定義
SENSITIVE_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{3,}"
    "secret\s*=\s*['\"][^'\"]{8,}"
    "api[_-]?key\s*=\s*['\"][^'\"]{10,}"
    "token\s*=\s*['\"][^'\"]{10,}"
    "private[_-]?key\s*=\s*['\"][^'\"]{20,}"
    "database[_-]?url\s*=\s*['\"][^'\"]{10,}"
    "jwt[_-]?secret\s*=\s*['\"][^'\"]{8,}"
    "[A-Za-z0-9]{20,}" # 長い英数字文字列（APIキー等の可能性）
)

EXCLUSIONS=(
    "node_modules/"
    ".git/"
    "dist/"
    ".log"
    ".md"
    "package-lock.json"
    "test"
    "spec"
)

# 除外パターンの構築
EXCLUDE_PATTERN=""
for exclusion in "${EXCLUSIONS[@]}"; do
    EXCLUDE_PATTERN="$EXCLUDE_PATTERN --exclude-dir=$exclusion"
done

# 機密情報検索
sensitive_found=false
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if grep -r -i -E $EXCLUDE_PATTERN "$pattern" . 2>/dev/null; then
        log_error "機密情報の可能性がある文字列が検出されました: $pattern"
        sensitive_found=true
    fi
done

if [ "$sensitive_found" = false ]; then
    log_success "機密情報漏洩チェック: 問題ありません"
else
    log_error "機密情報漏洩チェック: 機密情報の可能性がある文字列が検出されました"
    exit 1
fi

# 3. SQLインジェクション脆弱性チェック
log_info "3. SQLインジェクション脆弱性チェック実行中..."

# 危険なSQLパターンを検索
SQL_INJECTION_PATTERNS=(
    '\$\{[^}]*\}.*sql'  # テンプレートリテラル内のSQL
    'sql.*\+.*req\.'    # 文字列連結でのSQL構築
    'query.*\+.*params' # 危険なクエリ構築
    'execute.*\$\{.*\}' # 動的SQL実行
)

sql_injection_found=false
for pattern in "${SQL_INJECTION_PATTERNS[@]}"; do
    if grep -r -i -E $EXCLUDE_PATTERN "$pattern" src/ 2>/dev/null; then
        log_warning "SQLインジェクション脆弱性の可能性: $pattern"
        sql_injection_found=true
    fi
done

if [ "$sql_injection_found" = false ]; then
    log_success "SQLインジェクション脆弱性チェック: 問題ありません（Prisma使用により安全）"
else
    log_warning "SQLインジェクション脆弱性チェック: 潜在的リスクが検出されました"
fi

# 4. CORS設定検証
log_info "4. CORS設定検証実行中..."

if grep -r "cors" src/ | grep -q "origin.*true\|origin.*\*"; then
    log_warning "CORS設定: 全オリジン許可設定が検出されました。本番環境では制限してください。"
else
    log_success "CORS設定: 適切に制限されています"
fi

# 5. 環境変数設定チェック
log_info "5. 環境変数設定チェック実行中..."

required_env_vars=("DATABASE_URL" "JWT_SECRET")
missing_env_vars=()

for var in "${required_env_vars[@]}"; do
    if ! grep -q "process\.env\.$var" src/**/*.ts 2>/dev/null; then
        missing_env_vars+=("$var")
    fi
done

if [ ${#missing_env_vars[@]} -eq 0 ]; then
    log_success "環境変数設定: 必要な環境変数は適切に使用されています"
else
    log_warning "環境変数設定: 以下の環境変数の使用が確認できませんでした: ${missing_env_vars[*]}"
fi

log_success "セキュリティチェック完了！"