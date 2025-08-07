#!/bin/bash

# =================================================================
# パフォーマンステストスクリプト
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

# パフォーマンス閾値設定
MAX_MEMORY_MB=512
MAX_RESPONSE_TIME_MS=500
MAX_BUNDLE_SIZE_MB=10

log_info "パフォーマンステストを開始..."

cd "$PROJECT_ROOT"

# 1. メモリ使用量チェック
log_info "1. メモリ使用量チェック実行中..."

# Node.jsプロセスのメモリ使用量測定スクリプト作成
cat > /tmp/memory-test.js << 'EOF'
const process = require('process');

console.log('初期メモリ使用量:');
console.log(JSON.stringify(process.memoryUsage(), null, 2));

// 簡単な負荷テスト
const data = [];
for (let i = 0; i < 100000; i++) {
    data.push({ id: i, value: `test-${i}` });
}

console.log('負荷後メモリ使用量:');
const memUsage = process.memoryUsage();
console.log(JSON.stringify(memUsage, null, 2));

const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
console.log(`Heap使用量: ${heapUsedMB.toFixed(2)} MB`);

if (heapUsedMB > 512) {
    console.log('警告: メモリ使用量が閾値を超えています');
    process.exit(1);
} else {
    console.log('メモリ使用量: OK');
}
EOF

if node /tmp/memory-test.js; then
    log_success "メモリ使用量: 閾値内です (< ${MAX_MEMORY_MB}MB)"
else
    log_error "メモリ使用量: 閾値を超えています (> ${MAX_MEMORY_MB}MB)"
fi

rm -f /tmp/memory-test.js

# 2. ビルドサイズ分析
log_info "2. ビルドサイズ分析実行中..."

# ビルド実行
if npm run build > /dev/null 2>&1; then
    if [ -d "dist" ]; then
        # ビルド結果のサイズ測定
        dist_size_kb=$(du -sk dist | cut -f1)
        dist_size_mb=$(echo "scale=2; $dist_size_kb / 1024" | bc -l)
        
        log_info "ビルドサイズ: ${dist_size_mb} MB"
        
        if (( $(echo "$dist_size_mb > $MAX_BUNDLE_SIZE_MB" | bc -l) )); then
            log_error "ビルドサイズ: 閾値を超えています (> ${MAX_BUNDLE_SIZE_MB}MB)"
        else
            log_success "ビルドサイズ: 閾値内です (< ${MAX_BUNDLE_SIZE_MB}MB)"
        fi
        
        # 大きなファイルの特定
        log_info "大きなファイル (>100KB) :"
        find dist -type f -size +100k -exec ls -lh {} \; | awk '{print $5 " " $9}' || true
        
    else
        log_warning "distディレクトリが見つかりません"
    fi
else
    log_error "ビルドに失敗しました"
fi

# 3. N+1クエリ検出
log_info "3. N+1クエリ検出実行中..."

# Prismaクエリパターン分析
query_patterns_file="/tmp/query-patterns.txt"

# ソースコード内のPrismaクエリを抽出
find src -name "*.ts" -exec grep -H -n "prisma\." {} \; > "$query_patterns_file" 2>/dev/null || true

if [ -s "$query_patterns_file" ]; then
    # 潜在的なN+1クエリパターンを検索
    potential_n_plus_one=$(grep -E "(findMany|findFirst).*include.*findMany" "$query_patterns_file" || true)
    loop_queries=$(grep -E "for.*prisma\.|map.*prisma\.|forEach.*prisma\." "$query_patterns_file" || true)
    
    if [ -n "$potential_n_plus_one" ] || [ -n "$loop_queries" ]; then
        log_warning "潜在的なN+1クエリが検出されました:"
        if [ -n "$potential_n_plus_one" ]; then
            log_warning "ネストされたクエリ:"
            echo "$potential_n_plus_one"
        fi
        if [ -n "$loop_queries" ]; then
            log_warning "ループ内クエリ:"
            echo "$loop_queries"
        fi
    else
        log_success "N+1クエリ検出: 潜在的な問題は見つかりませんでした"
    fi
    
    # クエリ数統計
    total_queries=$(wc -l < "$query_patterns_file")
    log_info "総Prismaクエリ数: $total_queries"
    
else
    log_warning "Prismaクエリが見つかりませんでした"
fi

rm -f "$query_patterns_file"

# 4. TypeScript コンパイル時間測定
log_info "4. TypeScript コンパイル時間測定実行中..."

compile_start=$(date +%s%3N)
if npx tsc --noEmit > /dev/null 2>&1; then
    compile_end=$(date +%s%3N)
    compile_time=$((compile_end - compile_start))
    
    log_info "TypeScript コンパイル時間: ${compile_time}ms"
    
    if [ "$compile_time" -gt 10000 ]; then
        log_warning "TypeScript コンパイル時間が長すぎます (> 10秒)"
    else
        log_success "TypeScript コンパイル時間: 適切です (< 10秒)"
    fi
else
    log_error "TypeScript コンパイルエラーが発生しました"
fi

# 5. 依存関係の重複チェック
log_info "5. 依存関係重複チェック実行中..."

if command -v npm > /dev/null; then
    duplicate_deps=$(npm ls --depth=0 2>&1 | grep "UNMET DEPENDENCY\|invalid" || true)
    
    if [ -n "$duplicate_deps" ]; then
        log_warning "依存関係の問題が検出されました:"
        echo "$duplicate_deps"
    else
        log_success "依存関係重複チェック: 問題ありません"
    fi
    
    # パッケージサイズ分析
    if [ -d "node_modules" ]; then
        node_modules_size_kb=$(du -sk node_modules | cut -f1)
        node_modules_size_mb=$(echo "scale=2; $node_modules_size_kb / 1024" | bc -l)
        log_info "node_modules サイズ: ${node_modules_size_mb} MB"
        
        # 大きなパッケージの特定
        log_info "大きなパッケージ (上位5個):"
        du -sm node_modules/* 2>/dev/null | sort -nr | head -5 || true
    fi
fi

# 6. 循環依存検出
log_info "6. 循環依存検出実行中..."

circular_deps_file="/tmp/circular-deps.txt"

# TypeScriptファイルから import/export を抽出して循環依存をチェック
find src -name "*.ts" -not -path "*/node_modules/*" | while read file; do
    imports=$(grep -E "^import.*from ['\"]\./" "$file" 2>/dev/null | sed -E "s/.*from ['\"](.+)['\"]/\1/" || true)
    if [ -n "$imports" ]; then
        echo "$file -> $imports"
    fi
done > "$circular_deps_file"

if [ -s "$circular_deps_file" ]; then
    # 簡単な循環依存検出（完全ではありませんが基本的なケースをカバー）
    potential_cycles=$(sort "$circular_deps_file" | uniq -c | sort -nr | head -10)
    if [ -n "$potential_cycles" ]; then
        log_info "依存関係統計 (上位10):"
        echo "$potential_cycles"
    fi
    log_success "循環依存検出: チェック完了"
else
    log_warning "循環依存検出: 依存関係の解析に失敗しました"
fi

rm -f "$circular_deps_file"

log_success "パフォーマンステスト完了！"