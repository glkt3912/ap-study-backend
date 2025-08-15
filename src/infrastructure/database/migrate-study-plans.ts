/**
 * Study Plans データ移行スクリプト
 * 
 * 削除予定カラムのデータを settings JSON フィールドに安全に移行します。
 * Prisma の db:push 実行前に実行する必要があります。
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';

interface LegacyStudyPlan {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  totalWeeks: number;
  weeklyHours: number;
  dailyHours: number;
  isActive: boolean;
  isCustom: boolean;
  examDate: Date | null;
  startDate: Date;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  preferences: any;
  metadata: any;
  studyStartTime: string | null;
  studyEndTime: string | null;
  studyDays: any;
  breakInterval: number | null;
  focusSessionDuration: number | null;
  targetExamDate: Date | null;
  prioritySubjects: any;
  learningStyle: string | null;
  difficultyPreference: string | null;
  customSettings: any;
}

interface NewSettingsStructure {
  timeSettings: {
    totalWeeks: number;
    weeklyHours: number;
    dailyHours: number;
  };
  planType: {
    isCustom: boolean;
    source: string;
  };
  metadata: any;
  preferences: any;
  migrationInfo: {
    migratedFrom: string;
    migrationDate: string;
    originalColumns: string[];
  };
}

export async function migrateStudyPlansData(): Promise<void> {
  const prisma = new PrismaClient();
  
  try {
    logger.info('🚀 Study Plans データ移行を開始します...');
    
    // 1. 既存データの取得
    logger.info('📊 既存データを取得中...');
    const existingPlans = await prisma.$queryRaw<LegacyStudyPlan[]>`
      SELECT * FROM study_plans
    `;
    
    logger.info(`📋 ${existingPlans.length} 件のStudy Planが見つかりました`);
    
    if (existingPlans.length === 0) {
      logger.info('✅ 移行対象のデータがありません');
      return;
    }
    
    // 2. 各レコードに対してデータ移行を実行
    for (const plan of existingPlans) {
      logger.info(`🔄 ID ${plan.id} (${plan.name}) の移行中...`);
      
      // 新しい settings 構造を作成
      const newSettings: NewSettingsStructure = {
        timeSettings: {
          totalWeeks: plan.totalWeeks,
          weeklyHours: plan.weeklyHours,
          dailyHours: plan.dailyHours,
        },
        planType: {
          isCustom: plan.isCustom,
          source: plan.isCustom ? 'user_created' : 'template_based',
        },
        metadata: plan.metadata || {},
        preferences: plan.preferences || {},
        migrationInfo: {
          migratedFrom: 'legacy_schema',
          migrationDate: new Date().toISOString(),
          originalColumns: [
            'totalWeeks', 'weeklyHours', 'dailyHours', 
            'isCustom', 'metadata', 'preferences'
          ],
        },
      };
      
      // settings フィールドを更新
      await prisma.$executeRaw`
        UPDATE study_plans 
        SET settings = ${JSON.stringify(newSettings)}::jsonb
        WHERE id = ${plan.id}
      `;
      
      logger.info(`✅ ID ${plan.id} の移行完了`);
    }
    
    // 3. 移行結果の確認
    logger.info('🔍 移行結果を確認中...');
    const migratedPlans = await prisma.$queryRaw<any[]>`
      SELECT 
        id,
        name,
        settings->'timeSettings' as time_settings,
        settings->'planType' as plan_type,
        settings->'migrationInfo' as migration_info
      FROM study_plans
    `;
    
    logger.info('📋 移行結果:');
    migratedPlans.forEach(plan => {
      logger.info(`  - ID ${plan.id}: ${plan.name}`);
      logger.info(`    Time Settings: ${JSON.stringify(plan.time_settings)}`);
      logger.info(`    Plan Type: ${JSON.stringify(plan.plan_type)}`);
    });
    
    logger.info('✅ Study Plans データ移行が正常に完了しました');
    
  } catch (error) {
    logger.error('❌ データ移行中にエラーが発生しました:', error as Error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトが直接実行された場合の処理
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStudyPlansData()
    .then(() => {
      logger.info('🎉 移行スクリプトが正常に完了しました');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 移行スクリプトでエラーが発生しました:', error);
      process.exit(1);
    });
}