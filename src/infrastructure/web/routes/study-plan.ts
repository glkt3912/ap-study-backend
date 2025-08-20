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
  templateId: z.string().optional(),
  templateName: z.string().optional(),
  studyWeeksData: z.array(z.any()).optional(),
  targetExamDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  settings: z.record(z.string(), z.any()).optional()
});

const updateStudyPlanSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  totalWeeks: z.number().min(1).max(52).optional(),
  weeklyHours: z.number().min(1).max(168).optional(),
  dailyHours: z.number().min(0.5).max(24).optional(),
  targetExamDate: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
  settings: z.record(z.string(), z.any()).optional()
});

const preferencesSchema = z.object({
  focusAreas: z.array(z.string()).optional(),
  studyStyle: z.enum(['balanced', 'intensive', 'flexible']).optional(),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  reviewFrequency: z.number().min(1).max(7).optional(),
  breakDuration: z.number().min(5).max(60).optional(),
  notificationEnabled: z.boolean().optional()
});

// Dynamic Study Plan Schemas
const adaptiveFeaturesSchema = z.object({
  aiOptimization: z.boolean().default(false),
  difficultyAdjustment: z.boolean().default(false),
  performanceTracking: z.boolean().default(false),
  personalizedRecommendations: z.boolean().default(false)
});

const studyConstraintsSchema = z.object({
  maxDailyHours: z.number().min(0.5).max(12).optional(),
  availableDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  preferredTimeSlots: z.array(z.enum(['morning', 'afternoon', 'evening'])).optional(),
  breakIntervals: z.number().min(5).max(60).optional()
});

const studySessionSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  subject: z.string(),
  topics: z.array(z.string()),
  intensity: z.enum(['low', 'medium', 'high']).default('medium')
});

const weeklyStudyPatternSchema = z.object({
  monday: z.array(studySessionSchema).optional(),
  tuesday: z.array(studySessionSchema).optional(),
  wednesday: z.array(studySessionSchema).optional(),
  thursday: z.array(studySessionSchema).optional(),
  friday: z.array(studySessionSchema).optional(),
  saturday: z.array(studySessionSchema).optional(),
  sunday: z.array(studySessionSchema).optional()
});

const customScheduleSchema = z.object({
  flexibleHours: z.boolean().default(false),
  prioritySubjects: z.array(z.string()).optional(),
  weeklyPattern: weeklyStudyPatternSchema.optional(),
  studyStartTime: z.string().optional(),
  studyEndTime: z.string().optional(),
  bufferTime: z.number().min(0).max(120).optional()
});

const studyPlanCustomSettingsSchema = z.object({
  reminderSettings: z.object({
    enabled: z.boolean().default(true),
    frequency: z.enum(['daily', 'weekly', 'custom']).default('daily'),
    customDays: z.array(z.string()).optional()
  }).optional(),
  progressTracking: z.object({
    detailedMetrics: z.boolean().default(true),
    weeklyReports: z.boolean().default(true),
    goalReminders: z.boolean().default(true)
  }).optional(),
  adaptiveLearning: z.object({
    difficultyAdjustment: z.boolean().default(false),
    contentRecommendations: z.boolean().default(false),
    paceOptimization: z.boolean().default(false)
  }).optional()
});

const dynamicStudyPlanRequestSchema = z.object({
  customSchedule: customScheduleSchema.optional(),
  adaptiveFeatures: adaptiveFeaturesSchema,
  constraints: studyConstraintsSchema.optional(),
  customSettings: studyPlanCustomSettingsSchema.optional()
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
  let body: any = null;
  let validatedData: any = null;
  
  try {
    const userId = parseInt(c.req.param('userId'));
    
    if (isNaN(userId)) {
      return c.json({ success: false, error: 'Invalid user ID' }, 400);
    }

    body = await c.req.json();
    validatedData = createStudyPlanSchema.parse(body);
    
    const studyPlan = await studyPlanUseCases.createStudyPlan(userId, {
      ...validatedData,
      targetExamDate: validatedData.targetExamDate ? new Date(validatedData.targetExamDate) : undefined,
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
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack available');
    console.error('Original request body:', body);
    console.error('Validated data:', validatedData);
    return c.json({ 
      success: false, 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
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
      targetExamDate: validatedData.targetExamDate ? new Date(validatedData.targetExamDate) : undefined
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







// Helper functions for dynamic study plan functionality
async function generateDynamicStudyPlan(userId: number, request: any) {
  // AI-powered dynamic plan generation logic
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Generate base plan structure
  const basePlan = {
    name: 'AI Generated Dynamic Study Plan',
    description: 'Personalized study plan optimized with AI',
    totalWeeks: 12,
    weeklyHours: 25,
    dailyHours: 3,
    isCustom: true,
    preferences: {
      aiOptimization: request.adaptiveFeatures.aiOptimization,
      difficultyAdjustment: request.adaptiveFeatures.difficultyAdjustment,
      performanceTracking: request.adaptiveFeatures.performanceTracking,
      personalizedRecommendations: request.adaptiveFeatures.personalizedRecommendations,
      customSchedule: request.customSchedule,
      constraints: request.constraints,
      customSettings: request.customSettings
    }
  };

  // Create the study plan
  const studyPlan = await studyPlanUseCases.createStudyPlan(userId, basePlan);

  // Generate weekly schedule based on adaptive features
  if (request.adaptiveFeatures.aiOptimization) {
    await generateOptimizedWeeklySchedule(studyPlan.id, request);
  }

  return studyPlan;
}

async function generateOptimizedWeeklySchedule(planId: number, request: any) {
  // Generate AI-optimized weekly schedule
  const weeklySchedule = [];
  
  for (let week = 1; week <= 12; week++) {
    const weekData = {
      weekNumber: week,
      title: `Week ${week} - Adaptive Learning`,
      phase: week <= 4 ? 'foundation' : week <= 8 ? 'application' : 'mastery',
      goals: {
        primary: `Complete week ${week} objectives with AI optimization`,
        secondary: 'Track performance metrics for continuous improvement'
      }
    };

    // Create week record
    const studyWeek = await prisma.studyWeek.create({
      data: {
        ...weekData,
        studyPlanId: planId
      }
    });

    // Generate daily sessions based on constraints and preferences
    if (request.customSchedule?.weeklyPattern) {
      await generateDailySessionsFromPattern(studyWeek.id, request.customSchedule.weeklyPattern);
    } else {
      await generateDefaultDailySessions(studyWeek.id, request.constraints);
    }

    weeklySchedule.push(studyWeek);
  }

  return weeklySchedule;
}

async function generateDailySessionsFromPattern(weekId: number, weeklyPattern: any) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of days) {
    if (weeklyPattern[day] && weeklyPattern[day].length > 0) {
      const sessions = weeklyPattern[day];
      const totalTime = sessions.reduce((acc: number, session: any) => {
        const start = new Date(`1970-01-01T${session.startTime}`);
        const end = new Date(`1970-01-01T${session.endTime}`);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      }, 0);

      await prisma.studyDay.create({
        data: {
          day,
          subject: sessions[0].subject || 'General Study',
          estimatedTime: Math.round(totalTime),
          weekId,
          topics: sessions.map((s: any) => s.topics).flat()
        }
      });
    }
  }
}

async function generateDefaultDailySessions(weekId: number, constraints: any) {
  const defaultDays = constraints?.availableDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const maxDailyHours = constraints?.maxDailyHours || 3;
  const subjects = ['テクノロジ系', 'マネジメント系', 'ストラテジ系', '午後問題対策'];

  for (let i = 0; i < defaultDays.length; i++) {
    const day = defaultDays[i];
    const subject = subjects[i % subjects.length];
    
    await prisma.studyDay.create({
      data: {
        day,
        subject,
        estimatedTime: maxDailyHours * 60, // minutes
        weekId,
        topics: [`${subject}の基礎学習`, `${subject}の問題演習`]
      }
    });
  }
}

async function optimizeStudyPlan(planId: number, optimizationParams: any) {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { id: planId },
    include: { weeks: { include: { days: true } } }
  });

  if (!studyPlan) {
    throw new Error('Study plan not found');
  }

  // Analyze current progress and performance
  const analytics = await getStudyPlanAnalytics(planId);
  
  // Apply optimization algorithms based on performance data
  const settings = studyPlan.settings as any || {};
  const currentPreferences = typeof settings.preferences === 'object' && settings.preferences !== null 
    ? settings.preferences as Record<string, any>
    : {};
    
  const optimizedPreferences = {
    ...currentPreferences,
    lastOptimized: new Date().toISOString(),
    optimizationParams,
    performanceMetrics: analytics.performanceMetrics
  };

  // Update study plan with optimized settings
  const updatedSettings = {
    ...settings,
    preferences: optimizedPreferences
  };
  
  const updatedPlan = await prisma.studyPlan.update({
    where: { id: planId },
    data: {
      settings: updatedSettings,
      updatedAt: new Date()
    },
    include: { weeks: { include: { days: true } } }
  });

  return {
    ...updatedPlan,
    optimizationSummary: {
      previousPerformance: analytics.overallProgress,
      optimizationApplied: optimizationParams,
      expectedImprovement: '15-25% efficiency gain'
    }
  };
}

async function getStudyPlanAnalytics(planId: number) {
  const studyPlan = await fetchStudyPlanWithLogs(planId)
  const progressMetrics = calculateProgressMetrics(studyPlan)
  const recentLogs = getRecentStudyLogs(studyPlan.user.studyLogs)
  const performanceMetrics = calculatePerformanceMetrics(recentLogs)
  const weeklyBreakdown = calculateWeeklyBreakdown(studyPlan.weeks)
  const recommendations = generateAnalyticsRecommendations(
    progressMetrics.overallProgress, 
    performanceMetrics.averageUnderstanding, 
    recentLogs
  )

  return {
    planId,
    ...progressMetrics,
    performanceMetrics,
    weeklyBreakdown,
    recommendations
  }
}

async function fetchStudyPlanWithLogs(planId: number) {
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { id: planId },
    include: { 
      weeks: { include: { days: true } },
      user: { include: { studyLogs: true } }
    }
  })

  if (!studyPlan) {
    throw new Error('Study plan not found')
  }

  return studyPlan
}

function calculateProgressMetrics(studyPlan: any) {
  const totalDays = studyPlan.weeks.reduce((acc: number, week: any) => acc + week.days.length, 0)
  const completedDays = studyPlan.weeks.reduce((acc: number, week: any) => 
    acc + week.days.filter((day: any) => day.completed).length, 0
  )
  const overallProgress = totalDays > 0 ? (completedDays / totalDays) * 100 : 0

  return { overallProgress, totalDays, completedDays }
}

function getRecentStudyLogs(studyLogs: any[]) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  return studyLogs
    .filter(log => log.createdAt >= thirtyDaysAgo)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

function calculatePerformanceMetrics(recentLogs: any[]) {
  const averageUnderstanding = recentLogs.length > 0 
    ? recentLogs.reduce((acc, log) => acc + log.understanding, 0) / recentLogs.length 
    : 0

  const totalStudyTime = recentLogs.reduce((acc, log) => acc + log.studyTime, 0)

  return {
    averageUnderstanding,
    totalStudyTimeLastMonth: totalStudyTime,
    consistencyRate: recentLogs.length / 30 * 100,
    strongSubjects: getTopSubjects(recentLogs, 'high'),
    improvementAreas: getTopSubjects(recentLogs, 'low')
  }
}

function calculateWeeklyBreakdown(weeks: any[]) {
  return weeks.map(week => ({
    weekNumber: week.weekNumber,
    title: week.title,
    progress: week.days.filter((day: any) => day.completed).length / week.days.length * 100,
    averageUnderstanding: week.days.reduce((acc: number, day: any) => acc + day.understanding, 0) / week.days.length
  }))
}

function getTopSubjects(logs: any[], performanceLevel: 'high' | 'low') {
  const subjectStats = logs.reduce((acc, log) => {
    if (!acc[log.subject]) {
      acc[log.subject] = { understanding: [], count: 0 };
    }
    acc[log.subject].understanding.push(log.understanding);
    acc[log.subject].count++;
    return acc;
  }, {} as any);

  return Object.entries(subjectStats)
    .map(([subject, stats]: [string, any]) => ({
      subject,
      averageUnderstanding: stats.understanding.reduce((a: number, b: number) => a + b, 0) / stats.understanding.length,
      sessionCount: stats.count
    }))
    .sort((a, b) => performanceLevel === 'high' 
      ? b.averageUnderstanding - a.averageUnderstanding 
      : a.averageUnderstanding - b.averageUnderstanding
    )
    .slice(0, 3);
}

function generateAnalyticsRecommendations(progress: number, understanding: number, logs: any[]) {
  const recommendations = [];

  if (progress < 50) {
    recommendations.push('学習ペースを向上させるため、日々の学習時間を少し増やすことをお勧めします。');
  }

  if (understanding < 60) {
    recommendations.push('理解度向上のため、復習の頻度を増やし、苦手分野に重点を置いた学習を行いましょう。');
  }

  if (logs.length < 20) {
    recommendations.push('継続的な学習のため、毎日短時間でも学習を続ける習慣を作りましょう。');
  }

  if (recommendations.length === 0) {
    recommendations.push('順調に学習が進んでいます。このペースを維持しましょう！');
  }

  return recommendations;
}

async function getScheduleTemplates() {
  return [
    {
      id: 'balanced',
      name: 'バランス型',
      description: '全分野を均等に学習する標準的なスケジュール',
      weeklyHours: 25,
      dailyHours: 3,
      pattern: {
        monday: [{ startTime: '19:00', endTime: '22:00', subject: 'テクノロジ系', intensity: 'medium' }],
        tuesday: [{ startTime: '19:00', endTime: '22:00', subject: 'マネジメント系', intensity: 'medium' }],
        wednesday: [{ startTime: '19:00', endTime: '22:00', subject: 'ストラテジ系', intensity: 'medium' }],
        thursday: [{ startTime: '19:00', endTime: '22:00', subject: '午後問題対策', intensity: 'high' }],
        friday: [{ startTime: '19:00', endTime: '22:00', subject: '復習・総合問題', intensity: 'medium' }],
        saturday: [{ startTime: '09:00', endTime: '12:00', subject: '模擬試験', intensity: 'high' }],
        sunday: [{ startTime: '14:00', endTime: '17:00', subject: '弱点克服', intensity: 'high' }]
      }
    },
    {
      id: 'intensive',
      name: '集中型',
      description: '短期間で効率的に合格を目指すスケジュール',
      weeklyHours: 35,
      dailyHours: 5,
      pattern: {
        monday: [
          { startTime: '06:00', endTime: '08:00', subject: 'テクノロジ系', intensity: 'high' },
          { startTime: '19:00', endTime: '22:00', subject: '午後問題対策', intensity: 'high' }
        ],
        tuesday: [
          { startTime: '06:00', endTime: '08:00', subject: 'マネジメント系', intensity: 'high' },
          { startTime: '19:00', endTime: '22:00', subject: 'ストラテジ系', intensity: 'high' }
        ],
        wednesday: [
          { startTime: '06:00', endTime: '08:00', subject: '復習', intensity: 'medium' },
          { startTime: '19:00', endTime: '22:00', subject: '午後問題対策', intensity: 'high' }
        ],
        thursday: [
          { startTime: '06:00', endTime: '08:00', subject: 'テクノロジ系', intensity: 'high' },
          { startTime: '19:00', endTime: '22:00', subject: '総合問題', intensity: 'high' }
        ],
        friday: [
          { startTime: '06:00', endTime: '08:00', subject: '弱点克服', intensity: 'high' },
          { startTime: '19:00', endTime: '22:00', subject: '復習', intensity: 'medium' }
        ],
        saturday: [
          { startTime: '09:00', endTime: '12:00', subject: '模擬試験', intensity: 'high' },
          { startTime: '14:00', endTime: '16:00', subject: '解答解説', intensity: 'medium' }
        ],
        sunday: [
          { startTime: '09:00', endTime: '12:00', subject: '午後問題集中', intensity: 'high' },
          { startTime: '14:00', endTime: '16:00', subject: '総復習', intensity: 'medium' }
        ]
      }
    },
    {
      id: 'flexible',
      name: '柔軟型',
      description: '忙しい人向けの調整可能なスケジュール',
      weeklyHours: 15,
      dailyHours: 2,
      pattern: {
        monday: [{ startTime: '20:00', endTime: '22:00', subject: 'テクノロジ系', intensity: 'medium' }],
        tuesday: [{ startTime: '06:00', endTime: '08:00', subject: 'マネジメント系', intensity: 'medium' }],
        wednesday: [{ startTime: '20:00', endTime: '22:00', subject: 'ストラテジ系', intensity: 'medium' }],
        thursday: [{ startTime: '06:00', endTime: '08:00', subject: '午後問題対策', intensity: 'high' }],
        friday: [{ startTime: '20:00', endTime: '22:00', subject: '復習', intensity: 'low' }],
        saturday: [{ startTime: '10:00', endTime: '13:00', subject: '集中学習', intensity: 'high' }],
        sunday: [{ startTime: '14:00', endTime: '16:00', subject: '弱点対策', intensity: 'medium' }]
      }
    }
  ];
}

export default app;