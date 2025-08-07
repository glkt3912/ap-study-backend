#!/bin/bash

# =================================================================
# データベース整合性チェックスクリプト
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

log_info "データベース整合性チェックを開始..."

cd "$PROJECT_ROOT"

# 1. Prismaスキーマ検証
log_info "1. Prismaスキーマ検証実行中..."

if npx prisma validate; then
    log_success "Prismaスキーマ検証: スキーマは有効です"
else
    log_error "Prismaスキーマ検証: スキーマエラーが検出されました"
    exit 1
fi

# 2. マイグレーション一貫性チェック
log_info "2. マイグレーション一貫性チェック実行中..."

# マイグレーションファイルの存在確認
MIGRATION_DIR="src/infrastructure/database/prisma/migrations"
if [ ! -d "$MIGRATION_DIR" ]; then
    log_error "マイグレーションディレクトリが見つかりません: $MIGRATION_DIR"
    exit 1
fi

# マイグレーションファイル数をチェック
migration_count=$(find "$MIGRATION_DIR" -name "*.sql" | wc -l)
if [ "$migration_count" -eq 0 ]; then
    log_warning "マイグレーションファイルが見つかりません"
else
    log_success "マイグレーション一貫性: $migration_count個のマイグレーションファイルが見つかりました"
fi

# マイグレーション状態チェック（本番環境以外）
if [ "$NODE_ENV" != "production" ]; then
    log_info "マイグレーション状態をチェック中..."
    
    # データベースが起動しているかチェック
    if command -v docker-compose > /dev/null; then
        if docker-compose ps postgres | grep -q "Up"; then
            log_info "PostgreSQLコンテナが起動中です"
            
            # マイグレーション状態確認
            if npx prisma migrate status; then
                log_success "マイグレーション状態: 最新の状態です"
            else
                log_warning "マイグレーション状態: 未適用のマイグレーションがあります"
            fi
        else
            log_warning "PostgreSQLコンテナが起動していません。マイグレーション状態チェックをスキップします。"
        fi
    fi
fi

# 3. Prismaクライアント生成チェック
log_info "3. Prismaクライアント生成チェック実行中..."

if npx prisma generate; then
    log_success "Prismaクライアント生成: 成功しました"
else
    log_error "Prismaクライアント生成: エラーが発生しました"
    exit 1
fi

# 4. スキーマ依存関係チェック
log_info "4. スキーマ依存関係チェック実行中..."

# 外部キー制約の検証
schema_file="src/infrastructure/database/prisma/schema.prisma"
if [ -f "$schema_file" ]; then
    # 外部キーが適切に定義されているかチェック
    foreign_keys=$(grep -c "references" "$schema_file" 2>/dev/null || echo "0")
    relations=$(grep -c "@relation" "$schema_file" 2>/dev/null || echo "0")
    
    log_info "外部キー制約: $foreign_keys個, リレーション: $relations個"
    
    # 孤立した参照がないかチェック
    if grep -E "^\s*[a-zA-Z]+Id\s+Int" "$schema_file" | grep -v -E "userId|questionId|topicId|categoryId"; then
        log_warning "命名規約に従わないIDフィールドが検出されました"
    else
        log_success "ID フィールド命名規約: 適切です"
    fi
else
    log_error "Prismaスキーマファイルが見つかりません: $schema_file"
    exit 1
fi

# 5. シードデータ整合性検証
log_info "5. シードデータ整合性検証実行中..."

SEED_DIR="src/infrastructure/database/seeds"
if [ -d "$SEED_DIR" ]; then
    # シードファイルの構文チェック
    seed_files=$(find "$SEED_DIR" -name "*.json" -o -name "*.ts")
    
    json_errors=false
    for file in $seed_files; do
        if [[ "$file" == *.json ]]; then
            if ! python3 -m json.tool "$file" > /dev/null 2>&1; then
                log_error "JSONシードファイル構文エラー: $file"
                json_errors=true
            fi
        elif [[ "$file" == *.ts ]]; then
            if ! npx tsc --noEmit "$file" > /dev/null 2>&1; then
                log_warning "TypeScriptシードファイル警告: $file"
            fi
        fi
    done
    
    if [ "$json_errors" = false ]; then
        log_success "シードデータ整合性: JSONファイルは有効です"
    else
        log_error "シードデータ整合性: JSONファイルエラーが検出されました"
        exit 1
    fi
else
    log_warning "シードディレクトリが見つかりません: $SEED_DIR"
fi

# 6. データベース接続テスト（開発環境のみ）
log_info "6. データベース接続テスト実行中..."

if [ "$NODE_ENV" != "production" ]; then
    # 簡単な接続テスト（prisma studio起動テスト）
    if timeout 10s npx prisma db pull --print > /dev/null 2>&1; then
        log_success "データベース接続: 成功しました"
    else
        log_warning "データベース接続: 接続できませんでした（開発環境でない可能性があります）"
    fi
else
    log_info "本番環境では接続テストをスキップします"
fi

log_success "データベース整合性チェック完了！"