import { sign } from 'hono/jwt';

async function generateTestToken(userId = 7) {
  try {
    console.log(`🔄 ユーザーID ${userId} の開発環境用テストトークンを生成中...`);
    
    // ユーザー情報を取得
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new Error(`ユーザーID ${userId} が見つかりません`);
    }
    
    // .envファイルから正しいシークレットを読み込み
    const fs = await import('fs');
    const envContent = fs.readFileSync('.env', 'utf-8');
    const envLines = envContent.split('\n').filter(line => line.includes('JWT_SECRET='));
    const jwtSecretLine = envLines[0];
    const envSecret = jwtSecretLine ? jwtSecretLine.split('=')[1].trim().replace(/^['"#].*/, '').split('#')[0].trim() : null;
    
    const secret = envSecret || process.env.JWT_SECRET || 'development-secret-key';
    console.log('🔑 Using JWT Secret:', secret?.substring(0, 20) + '...');
    const payload = {
      sub: userId.toString(),
      userId: userId,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30) // 30日有効
    };
    
    const token = await sign(payload, secret);
    
    console.log('✅ テストトークンを生成しました:');
    console.log(`👤 User ID: ${userId}`);
    console.log(`📧 Email: ${user.email}`);
    console.log(`👤 Name: ${user.name}`);
    console.log('🔑 JWT Token:');
    console.log(token);
    console.log('');
    console.log('💡 フロントエンドで使用する場合:');
    console.log('localStorage.setItem("ap-study-token", "' + token + '");');
    
    await prisma.$disconnect();
    
    return token;
    
  } catch (error) {
    console.error('❌ テストトークン生成エラー:', error);
    throw error;
  }
}

// 直接実行の場合
if (import.meta.url === `file://${process.argv[1]}`) {
  const userId = process.argv[2] ? parseInt(process.argv[2]) : 7;
  generateTestToken(userId);
}

export { generateTestToken };