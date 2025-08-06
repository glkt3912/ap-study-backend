import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from 'src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function seedQuestions() {
  try {
    logger.info('📚 過去問データのシードを開始...');

    // 既存の過去問データを削除
    await prisma.userAnswer.deleteMany();
    await prisma.question.deleteMany();
    logger.info('🗑️ 既存データを削除しました');

    // 年度別ファイルから過去問データを読み込み
    const years = [2025, 2024, 2023, 2022];
    let allQuestionsData: any[] = [];

    for (const year of years) {
      const questionsPath = path.join(__dirname, `questions-${year}.json`);
      
      if (fs.existsSync(questionsPath)) {
        const yearQuestionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));
        allQuestionsData = allQuestionsData.concat(yearQuestionsData);
        logger.info(`📖 ${year}年度: ${yearQuestionsData.length}問を読み込み`);
      } else {
        logger.warn(`⚠️ ${year}年度のファイルが見つかりません: questions-${year}.json`);
      }
    }

    logger.info(`📚 総読み込み問題数: ${allQuestionsData.length}問`);

    // データベースに挿入
    for (let i = 0; i < allQuestionsData.length; i++) {
      const questionData = allQuestionsData[i];
      try {
        logger.info(`挿入中: ${i + 1}/${allQuestionsData.length} - ${questionData.id}`);
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
      } catch (insertError) {
        logger.error(`問題 ${questionData.id} の挿入に失敗:`, insertError);
        logger.error('問題データ:', JSON.stringify(questionData, null, 2));
        throw insertError;
      }
    }

    logger.info(`✅ ${allQuestionsData.length}件の過去問データを投入しました`);

    // データ確認
    const totalQuestions = await prisma.question.count();
    const categories = await prisma.question.groupBy({
      by: ['category'],
      _count: { category: true },
    });

    logger.info(`📊 総問題数: ${totalQuestions}`);
    logger.info('📋 カテゴリ別問題数:');
    categories.forEach(cat => {
      logger.info(`  - ${cat.category}: ${cat._count.category}問`);
    });

  } catch (error) {
    logger.error('❌ シード実行中にエラーが発生しました:');
    if (error instanceof Error) {
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
    } else {
      logger.error('Unknown error:', error);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuestions()
    .catch((error) => {
      logger.error('Seed execution failed:', error);
      process.exit(1);
    });
}

export { seedQuestions };