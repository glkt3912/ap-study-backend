// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

// 環境変数の型定義
interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

// 環境変数の検証
function validateSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('SUPABASE_URL環境変数が設定されていません');
  }

  if (!anonKey) {
    throw new Error('SUPABASE_ANON_KEY環境変数が設定されていません');
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
  };
}

// Supabase クライアントの作成
let supabaseClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    const config = validateSupabaseConfig();
    
    supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false, // サーバーサイドでは無効
      },
    });
  }
  
  return supabaseClient;
}

// Service Role クライアント（管理者権限が必要な場合）
let supabaseServiceClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseServiceClient() {
  if (!supabaseServiceClient) {
    const config = validateSupabaseConfig();
    
    if (!config.serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません');
    }
    
    supabaseServiceClient = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  
  return supabaseServiceClient;
}

// 現在はPrismaをメインで使用するため、Supabaseクライアントはオプション
// 将来的に認証機能などを追加する際に活用