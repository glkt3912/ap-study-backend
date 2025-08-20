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
    logger.info('📚 過去問データのシードを開始...')
    
    await cleanupExistingData()
    const allQuestionsData = await loadQuestionsData()
    await insertQuestionsData(allQuestionsData)
    await logDataSummary()
    
  } catch (error) {
    handleError(error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function cleanupExistingData() {
  await prisma.userAnswer.deleteMany()
  await prisma.question.deleteMany()
  logger.info('🗑️ 既存データを削除しました')
}

async function loadQuestionsData() {
  const years = [2025, 2024, 2023, 2022, 2021, 2020]
  let allQuestionsData: any[] = []

  for (const year of years) {
    const questionsPath = path.join(__dirname, 'data', `questions-${year}.json`)
    
    if (fs.existsSync(questionsPath)) {
      const yearQuestionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'))
      allQuestionsData = allQuestionsData.concat(yearQuestionsData)
      logger.info(`📖 ${year}年度: ${yearQuestionsData.length}問を読み込み`)
    } else {
      logger.warn(`⚠️ ${year}年度のファイルが見つかりません: questions-${year}.json`)
    }
  }

  logger.info(`📚 総読み込み問題数: ${allQuestionsData.length}問`)
  return allQuestionsData
}

async function insertQuestionsData(allQuestionsData: any[]) {
  for (let i = 0; i < allQuestionsData.length; i++) {
    const questionData = allQuestionsData[i]
    await insertSingleQuestion(questionData, i + 1, allQuestionsData.length)
  }
  logger.info(`✅ ${allQuestionsData.length}件の過去問データを投入しました`)
}

async function insertSingleQuestion(questionData: any, current: number, total: number) {
  try {
    logger.info(`挿入中: ${current}/${total} - ${questionData.id}`)
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
    })
  } catch (insertError) {
    handleInsertError(insertError, questionData)
    throw insertError
  }
}

function handleInsertError(insertError: unknown, questionData: any) {
  const errorMessage = `問題 ${questionData.id} の挿入に失敗:`
  const errorDetails = `問題データ: ${JSON.stringify(questionData, null, 2)}`

  if (insertError instanceof Error) {
    logger.error(errorMessage, insertError)
    logger.error(errorDetails)
  } else {
    logger.error(errorMessage, new Error(String(insertError)))
    logger.error(errorDetails)
  }
}

async function logDataSummary() {
  const totalQuestions = await prisma.question.count()
  const categories = await prisma.question.groupBy({
    by: ['category'],
    _count: { category: true },
  })

  logger.info(`📊 総問題数: ${totalQuestions}`)
  logger.info('📋 カテゴリ別問題数:')
  categories.forEach(cat => {
    logger.info(`  - ${cat.category}: ${cat._count.category}問`)
  })
}

function handleError(error: unknown) {
  const mainErrorMessage = '❌ シード実行中にエラーが発生しました:'

  if (error instanceof Error) {
    logger.error(mainErrorMessage, error)
    logger.error(`Error message: ${error.message}`)
    if (error.stack) {
      logger.error(`Error stack: ${error.stack}`)
    }
  } else {
    logger.error(mainErrorMessage, new Error(String(error)))
    logger.error(`Unknown error: ${String(error)}`)
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  seedQuestions().catch(error => {
    logger.error('Seed execution failed:', error);
    process.exit(1);
  });
}

export { seedQuestions };
