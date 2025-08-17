// データベースシード統合エントリーポイント

import { seedQuestions } from './questions.js';
import { logger } from 'src/utils/logger.js';

/**
 * データベースシード実行
 * - 過去問データ（questions）のみ
 * 注意: 学習計画データは含まれません（ユーザーデータ保護のため）
 */
async function seedAll() {
  try {
    logger.info('🌱 過去問データシード処理を開始...');

    // 過去問データシード
    logger.info('📚 過去問データシードを実行...');
    await seedQuestions();

    logger.info('✅ 過去問データシード処理が完了しました');
    
    return {
      success: true,
      message: '過去問データシード処理完了',
    };
  } catch (error) {
    const errorMessage = '❌ 過去問データシード処理でエラーが発生しました';
    
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

export { seedAll, seedQuestions };