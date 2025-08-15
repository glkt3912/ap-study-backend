const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('🔄 テストユーザーを作成中...');
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // 既存のユーザーを削除（もし存在する場合）
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'test@example.com' },
          { username: 'testuser' }
        ]
      }
    });
    
    // テストユーザーを作成
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        name: 'テストユーザー',
        password: hashedPassword,
        role: 'user'
      }
    });
    
    console.log('✅ テストユーザーを作成しました:');
    console.log('📧 Email: test@example.com');
    console.log('👤 Username: testuser');
    console.log('🔑 Password: password123');
    console.log(`🆔 User ID: ${user.id}`);
    
    return user;
    
  } catch (error) {
    console.error('❌ テストユーザー作成エラー:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 直接実行の場合
if (require.main === module) {
  createTestUser();
}

module.exports = { createTestUser };