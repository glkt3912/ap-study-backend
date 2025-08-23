// Hono API ルート - 学習計画関連

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { GetStudyPlanUseCase } from 'src/domain/usecases/GetStudyPlan.js';
import { UpdateStudyProgressUseCase } from 'src/domain/usecases/UpdateStudyProgress.js';
import { getAuthUser, type Variables } from '../middleware/auth.js';

// バリデーションスキーマ
const updateProgressSchema = z.object({
  weekNumber: z.number().min(1).max(12),
  dayIndex: z.number().min(0).max(6),
  actualTime: z.number().min(0).optional(),
  understanding: z.number().min(1).max(5).optional(),
  memo: z.string().optional(),
  completed: z.boolean().optional(),
});

export function createStudyRoutes(
  getStudyPlanUseCase: GetStudyPlanUseCase,
  updateStudyProgressUseCase: UpdateStudyProgressUseCase,
) {
  const app = new Hono<{ Variables: Variables }>();

  // GET /api/study/plan - 全学習計画取得（ユーザー別）
  app.get('/plan', async c => {
    try {
      const authUser = getAuthUser(c);
      console.log('Getting study plan for user:', authUser.userId);
      const weeks = await getStudyPlanUseCase.executeForUser(authUser.userId);
      console.log('Retrieved weeks:', weeks.length);
      console.log('First week goals type:', typeof weeks[0]?.goals, weeks[0]?.goals);

      return c.json({
        success: true,
        data: weeks.map(week => ({
          id: week.id,
          weekNumber: week.weekNumber,
          title: week.title,
          phase: week.phase,
          goals: week.goals,
          days: week.days,
          progressPercentage: week.getProgressPercentage(),
          totalStudyTime: week.getTotalStudyTime(),
          averageUnderstanding: week.getAverageUnderstanding(),
        })),
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '学習計画の取得に失敗しました',
        },
        500,
      );
    }
  });

  // GET /api/study/plan/:weekNumber - 特定週の計画取得
  app.get('/plan/:weekNumber', async c => {
    try {
      const authUser = getAuthUser(c);
      const weekNumber = parseInt(c.req.param('weekNumber'));
      const week = await getStudyPlanUseCase.getWeekForUser(authUser.userId, weekNumber);

      return c.json({
        success: true,
        data: {
          id: week.id,
          weekNumber: week.weekNumber,
          title: week.title,
          phase: week.phase,
          goals: week.goals,
          days: week.days,
          progressPercentage: week.getProgressPercentage(),
          totalStudyTime: week.getTotalStudyTime(),
          averageUnderstanding: week.getAverageUnderstanding(),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '週の取得に失敗しました',
        },
        404,
      );
    }
  });

  // GET /api/study/current-week - 現在の週取得
  app.get('/current-week', async c => {
    try {
      const authUser = getAuthUser(c);
      const currentWeek = await getStudyPlanUseCase.getCurrentWeekForUser(authUser.userId);

      return c.json({
        success: true,
        data: {
          id: currentWeek.id,
          weekNumber: currentWeek.weekNumber,
          title: currentWeek.title,
          phase: currentWeek.phase,
          goals: currentWeek.goals,
          days: currentWeek.days,
          progressPercentage: currentWeek.getProgressPercentage(),
          totalStudyTime: currentWeek.getTotalStudyTime(),
          averageUnderstanding: currentWeek.getAverageUnderstanding(),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '現在の週の取得に失敗しました',
        },
        500,
      );
    }
  });

  // Helper functions for progress update
  const parseRequestBody = async (c: any) => {
    const requestBody = await c.req.json();
    const validationResult = updateProgressSchema.safeParse(requestBody);
    if (!validationResult.success) {
      throw new Error('Validation failed');
    }
    return validationResult.data;
  };

  const updateCompletionStatus = async (weekNumber: number, dayIndex: number, completed?: boolean) => {
    if (completed !== undefined) {
      if (completed) {
        await updateStudyProgressUseCase.completeTask(weekNumber, dayIndex);
      } else {
        await updateStudyProgressUseCase.uncompleteTask(weekNumber, dayIndex);
      }
    }
  };

  const updateStudyData = async (
    weekNumber: number,
    dayIndex: number,
    actualTime?: number,
    understanding?: number,
    memo?: string,
  ) => {
    if (actualTime !== undefined) {
      await updateStudyProgressUseCase.updateStudyTime(weekNumber, dayIndex, actualTime);
    }

    if (understanding !== undefined) {
      await updateStudyProgressUseCase.updateUnderstanding(weekNumber, dayIndex, understanding);
    }

    if (memo !== undefined) {
      await updateStudyProgressUseCase.updateMemo(weekNumber, dayIndex, memo);
    }
  };

  // PUT /api/study/progress - 学習進捗更新
  app.put('/progress', async c => {
    try {
      const { weekNumber, dayIndex, actualTime, understanding, memo, completed } = await parseRequestBody(c);

      await updateCompletionStatus(weekNumber, dayIndex, completed);
      await updateStudyData(weekNumber, dayIndex, actualTime, understanding, memo);

      return c.json({
        success: true,
        message: '進捗が更新されました',
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : '進捗の更新に失敗しました',
        },
        400,
      );
    }
  });

  // POST /api/study/complete-task - タスク完了
  app.post(
    '/complete-task',
    zValidator(
      'json',
      z.object({
        weekNumber: z.number().min(1).max(12),
        dayIndex: z.number().min(0).max(6),
      }) as any,
    ),
    async c => {
      try {
        const { weekNumber, dayIndex } = c.req.valid('json');
        const updatedWeek = await updateStudyProgressUseCase.completeTask(weekNumber, dayIndex);

        return c.json({
          success: true,
          data: {
            id: updatedWeek.id,
            weekNumber: updatedWeek.weekNumber,
            title: updatedWeek.title,
            phase: updatedWeek.phase,
            goals: updatedWeek.goals,
            days: updatedWeek.days,
            progressPercentage: updatedWeek.getProgressPercentage(),
            totalStudyTime: updatedWeek.getTotalStudyTime(),
            averageUnderstanding: updatedWeek.getAverageUnderstanding(),
          },
          message: 'タスクが完了しました',
        });
      } catch (error) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'タスクの完了に失敗しました',
          },
          400,
        );
      }
    },
  );

  return app;
}
