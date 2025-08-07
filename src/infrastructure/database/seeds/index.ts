// データベースシード統合エントリーポイント

import { seedQuestions } from './questions.js';
import { seedStudyPlan } from './study-plan.js';
import { logger } from 'src/utils/logger.js';

/**
 * 全データベースシード実行
 * - 過去問データ（questions）
 * - 学習計画データ（study-plan）
 */
async function seedAll() {
  try {
    logger.info('🌱 全データベースシード処理を開始...');

    // 1. 過去問データシード
    logger.info('📚 過去問データシードを実行...');
    await seedQuestions();
    
    // 2. 学習計画データシード
    logger.info('📅 学習計画データシードを実行...');
    await seedStudyPlan();

    logger.info('✅ 全データベースシード処理が完了しました');
    
    return {
      success: true,
      message: '全シード処理完了',
    };
  } catch (error) {
    const errorMessage = '❌ 全データベースシード処理でエラーが発生しました';
    
    if (error instanceof Error) {
      logger.error(errorMessage, error);
      logger.error(`Error message: ${error.message}`);
      if (error.stack) {
        logger.error(`Error stack: ${error.stack}`);
      }
    } else {
      logger.error(errorMessage, new Error(String(error)));
      logger.error(`Unknown error: ${String(error)}`);
    }
    
    throw error;
  }
}

// 直接実行された場合のみシードを実行
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAll()
    .then(() => {
      logger.info('🎉 シード処理が完了しました');
      process.exit(0);
    })
    .catch(error => {
      logger.error('💥 シード処理でエラーが発生しました:', error);
      process.exit(1);
    });
}

export { seedAll, seedQuestions, seedStudyPlan };