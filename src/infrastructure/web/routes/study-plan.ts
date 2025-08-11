import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { StudyPlanRepository } from '../../database/repositories/StudyPlanRepository.js';
import { StudyRepository } from '../../database/repositories/StudyRepository.js';
import { StudyPlanUseCases } from '../../../domain/usecases/StudyPlanUseCases.js';

const app = new Hono();
const prisma = new PrismaClient();
const studyPlanRepository = new StudyPlanRepository(prisma);
const studyRepository = new StudyRepository(prisma);
const studyPlanUseCases = new StudyPlanUseCases(studyPlanRepository, studyRepository);

// バリデーションスキーマ
const createStudyPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  totalWeeks: z.number().min(1).max(52).optional(),
  weeklyHours: z.number().min(1).max(168).optional(),
  dailyHours: z.number().min(0.5).max(24).optional(),
  examDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  preferences: z.record(z.string(), z.any()).optional()
});

const updateStudyPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  totalWeeks: z.number().min(1).max(52).optional(),
  weeklyHours: z.number().min(1).max(168).optional(),
  dailyHours: z.number().min(0.5).max(24).optional(),
  examDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  preferences: z.record(z.string(), z.any()).optional()
});

const preferencesSchema = z.object({
  focusAreas: z.array(z.string()).optional(),
  studyStyle: z.enum(['balanced', 'intensive', 'flexible']).optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  reviewFrequency: z.number().min(1).max(7).optional(),
  breakDuration: z.number().min(5).max(60).optional(),
  notificationEnabled: z.boolean().optional()
});

// GET /study-plan/:userId - ユーザーの学習計画取得
app.get('/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ success: false, error: 'Invalid user ID' }, 400);
    }

    const studyPlan = await studyPlanUseCases.getUserStudyPlan(userId);
    
    if (!studyPlan) {
      return c.json({ success: false, error: 'Study plan not found' }, 404);
    }

    return c.json({
      success: true,
      data: studyPlan
    });
  } catch (error) {
    console.error('Error fetching study plan:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /study-plan/:userId - 学習計画作成
app.post('/:userId', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ success: false, error: 'Invalid user ID' }, 400);
    }

    const body = await c.req.json();
    const validatedData = createStudyPlanSchema.parse(body);
    
    const studyPlan = await studyPlanUseCases.createStudyPlan(userId, {
      ...validatedData,
      examDate: validatedData.examDate ? new Date(validatedData.examDate) : undefined,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined
    });

    return c.json({
      success: true,
      data: studyPlan
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Validation error', details: error.issues }, 400);
    }
    console.error('Error creating study plan:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PUT /study-plan/:planId - 学習計画更新
app.put('/:planId', async (c) => {
  try {
    const planId = parseInt(c.req.param('planId'));
    
    if (isNaN(planId)) {
      return c.json({ success: false, error: 'Invalid plan ID' }, 400);
    }

    const body = await c.req.json();
    const validatedData = updateStudyPlanSchema.parse(body);
    
    const studyPlan = await studyPlanUseCases.updateStudyPlan(planId, {
      ...validatedData,
      examDate: validatedData.examDate ? new Date(validatedData.examDate) : undefined,
      endDate: validatedData.endDate ? new Date(validatedData.endDate) : undefined
    });

    return c.json({
      success: true,
      data: studyPlan
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Validation error', details: error.issues }, 400);
    }
    console.error('Error updating study plan:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// DELETE /study-plan/:planId - 学習計画削除
app.delete('/:planId', async (c) => {
  try {
    const planId = parseInt(c.req.param('planId'));
    
    if (isNaN(planId)) {
      return c.json({ success: false, error: 'Invalid plan ID' }, 400);
    }

    await studyPlanUseCases.deleteStudyPlan(planId);

    return c.json({
      success: true,
      data: { message: 'Study plan deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting study plan:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /study-plan/:userId/from-template - テンプレートから学習計画作成
app.post('/:userId/from-template', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ success: false, error: 'Invalid user ID' }, 400);
    }

    const body = await c.req.json();
    const templateName = body.templateName || 'default';
    const customizations = body.customizations || {};

    const studyPlan = await studyPlanUseCases.createFromTemplate(userId, templateName, customizations);

    return c.json({
      success: true,
      data: studyPlan
    });
  } catch (error) {
    console.error('Error creating study plan from template:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /study-plan/:planId/progress - 学習計画の進捗取得
app.get('/:planId/progress', async (c) => {
  try {
    const planId = parseInt(c.req.param('planId'));
    
    if (isNaN(planId)) {
      return c.json({ success: false, error: 'Invalid plan ID' }, 400);
    }

    const progress = await studyPlanUseCases.getStudyPlanProgress(planId);

    return c.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('Error fetching study plan progress:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PUT /study-plan/:planId/preferences - 学習設定調整
app.put('/:planId/preferences', async (c) => {
  try {
    const planId = parseInt(c.req.param('planId'));
    
    if (isNaN(planId)) {
      return c.json({ success: false, error: 'Invalid plan ID' }, 400);
    }

    const body = await c.req.json();
    const validatedPreferences = preferencesSchema.parse(body);
    
    const studyPlan = await studyPlanUseCases.adjustStudyPlan(planId, validatedPreferences);

    return c.json({
      success: true,
      data: studyPlan
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: 'Validation error', details: error.issues }, 400);
    }
    console.error('Error adjusting study plan preferences:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /study-plan/:userId/recommendations - 学習推奨事項取得
app.get('/:userId/recommendations', async (c) => {
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ success: false, error: 'Invalid user ID' }, 400);
    }

    const recommendations = await studyPlanUseCases.generateRecommendations(userId);

    return c.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default app;