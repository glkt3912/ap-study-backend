import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { z } from 'zod'

// 基本的なスキーマ定義
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.boolean(),
  data: dataSchema,
  error: z.string().optional(),
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
})

// 学習計画関連スキーマ
export const StudyDaySchema = z.object({
  id: z.number(),
  day: z.string(),
  subject: z.string(),
  topics: z.array(z.string()),
  estimatedTime: z.number(),
  actualTime: z.number(),
  completed: z.boolean(),
  understanding: z.number(),
  memo: z.string().optional(),
})

export const StudyWeekSchema = z.object({
  id: z.number(),
  weekNumber: z.number(),
  title: z.string(),
  phase: z.string(),
  goals: z.array(z.string()),
  days: z.array(StudyDaySchema),
  progressPercentage: z.number(),
  totalStudyTime: z.number(),
  averageUnderstanding: z.number(),
})

// 学習記録関連スキーマ
export const StudyLogSchema = z.object({
  id: z.number().optional(),
  date: z.string(),
  subject: z.string(),
  topics: z.array(z.string()),
  studyTime: z.number(),
  understanding: z.number(),
  memo: z.string().optional(),
  efficiency: z.number().optional(),
})

export const CreateStudyLogSchema = StudyLogSchema.omit({ id: true, efficiency: true })

// テスト記録関連スキーマ
export const MorningTestSchema = z.object({
  id: z.number().optional(),
  date: z.string(),
  category: z.string(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  accuracy: z.number().optional(),
  timeSpent: z.number(),
  memo: z.string().optional(),
})

export const AfternoonTestSchema = z.object({
  id: z.number().optional(),
  date: z.string(),
  category: z.string(),
  score: z.number(),
  timeSpent: z.number(),
  memo: z.string().optional(),
})

export const CreateMorningTestSchema = MorningTestSchema.omit({ id: true, accuracy: true })
export const CreateAfternoonTestSchema = AfternoonTestSchema.omit({ id: true })

// クイズ関連スキーマ
export const QuestionSchema = z.object({
  id: z.string(),
  year: z.number(),
  season: z.string(),
  section: z.string(),
  number: z.number(),
  category: z.string(),
  subcategory: z.string().optional(),
  difficulty: z.number(),
  question: z.string(),
  choices: z.array(z.string()),
  tags: z.array(z.string()).optional(),
})

export const QuizSessionSchema = z.object({
  id: z.number(),
  userId: z.string().optional(),
  sessionType: z.enum(['category', 'random', 'review', 'weak_points']),
  category: z.string().optional(),
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  totalTime: z.number(),
  avgTimePerQ: z.number(),
  score: z.number(),
  startedAt: z.string(),
  completedAt: z.string().optional(),
  isCompleted: z.boolean(),
})

export const StartQuizSessionSchema = z.object({
  sessionType: z.enum(['category', 'random', 'review', 'weak_points']),
  questionCount: z.number(),
  category: z.string().optional(),
})

export const SubmitAnswerSchema = z.object({
  sessionId: z.number(),
  questionId: z.string(),
  userAnswer: z.string(),
  timeSpent: z.number().optional(),
})

// OpenAPI仕様を設定
export function createOpenAPIApp() {
  const app = new Hono()

  // 基本的なOpenAPI仕様書
  const openAPISpec = {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'AP Study Management API',
      description: '応用情報技術者試験 学習管理システム API',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
    ],
    paths: {
      '/api/study/plan': {
        get: {
          tags: ['Study Plan'],
          summary: '全学習計画取得',
          description: '12週間分の学習計画を取得します',
          responses: {
            '200': {
              description: '学習計画の取得に成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'number' },
                            weekNumber: { type: 'number' },
                            title: { type: 'string' },
                            phase: { type: 'string' },
                            goals: { type: 'array', items: { type: 'string' } },
                            progressPercentage: { type: 'number' },
                            totalStudyTime: { type: 'number' },
                            averageUnderstanding: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '500': {
              description: 'サーバーエラー',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      error: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/studylog': {
        get: {
          tags: ['Study Log'],
          summary: '学習記録取得',
          description: '全ての学習記録を取得します',
          responses: {
            '200': {
              description: '学習記録の取得に成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'number' },
                            date: { type: 'string', format: 'date' },
                            subject: { type: 'string' },
                            topics: { type: 'array', items: { type: 'string' } },
                            studyTime: { type: 'number' },
                            understanding: { type: 'number', minimum: 1, maximum: 5 },
                            memo: { type: 'string' },
                            efficiency: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Study Log'],
          summary: '学習記録作成',
          description: '新しい学習記録を作成します',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['date', 'subject', 'topics', 'studyTime', 'understanding'],
                  properties: {
                    date: { type: 'string', format: 'date' },
                    subject: { type: 'string' },
                    topics: { type: 'array', items: { type: 'string' } },
                    studyTime: { type: 'number', minimum: 0 },
                    understanding: { type: 'number', minimum: 1, maximum: 5 },
                    memo: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: '学習記録の作成に成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          id: { type: 'number' },
                          date: { type: 'string' },
                          subject: { type: 'string' },
                          topics: { type: 'array', items: { type: 'string' } },
                          studyTime: { type: 'number' },
                          understanding: { type: 'number' },
                          memo: { type: 'string' },
                          efficiency: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
      },
    },
  }

  // OpenAPI仕様書エンドポイント
  app.get('/doc', (c) => {
    return c.json(openAPISpec)
  })

  // Swagger UI設定
  app.get('/ui', swaggerUI({ url: '/doc' }))

  return app
}

// 共通レスポンスヘルパー
export function createSuccessResponse<T>(data: T) {
  return {
    success: true as const,
    data,
  }
}

export function createErrorResponse(error: string, status = 500) {
  return {
    success: false as const,
    error,
  }
}