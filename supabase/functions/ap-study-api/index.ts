// Supabase Edge Functions entry point
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import app from '../../../src/app.ts';

// Supabase Edge Functionsでは Deno を使用するため、
// このファイルは参考用です。
// 実際には Node.js アプリケーションを Deno 用に移植する必要があります。

serve(async (req) => {
  return app.fetch(req);
});