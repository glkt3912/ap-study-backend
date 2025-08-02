import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function seedQuestions() {
  try {
    console.log('📚 過去問データのシードを開始...');

    // 既存の過去問データを削除
    await prisma.userAnswer.deleteMany();
    await prisma.question.deleteMany();
    console.log('🗑️ 既存データを削除しました');

    // JSON ファイルから過去問データを読み込み
    const questionsPath = path.join(__dirname, 'questions.json');
    const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

    // データベースに挿入
    for (const questionData of questionsData) {
      await prisma.question.create({
        data: {
          id: questionData.id,
          year: questionData.year,
          season: questionData.season,
          section: questionData.section,
          number: questionData.number,
          category: questionData.category,
          subcategory: questionData.subcategory,
          difficulty: questionData.difficulty,
          question: questionData.question,
          choices: JSON.stringify(questionData.choices),
          answer: questionData.answer,
          explanation: questionData.explanation,
          tags: JSON.stringify(questionData.tags),
        },
      });
    }

    console.log(`✅ ${questionsData.length}件の過去問データを投入しました`);

    // データ確認
    const totalQuestions = await prisma.question.count();
    const categories = await prisma.question.groupBy({
      by: ['category'],
      _count: { category: true },
    });

    console.log(`📊 総問題数: ${totalQuestions}`);
    console.log('📋 カテゴリ別問題数:');
    categories.forEach(cat => {
      console.log(`  - ${cat.category}: ${cat._count.category}問`);
    });

  } catch (error) {
    console.error('❌ シード実行中にエラーが発生しました:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuestions()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedQuestions };