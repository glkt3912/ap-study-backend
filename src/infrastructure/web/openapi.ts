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

// 試験設定関連スキーマ
export const ExamConfigSchema = z.object({
  id: z.number(),
  userId: z.number(),
  examDate: z.string(),
  targetScore: z.number().optional(),
  remainingDays: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const CreateExamConfigSchema = z.object({
  examDate: z.string(),
  targetScore: z.number().optional(),
})

export const UpdateExamConfigSchema = z.object({
  examDate: z.string().optional(),
  targetScore: z.number().optional(),
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

// Learning Efficiency Analysis API
export const LearningEfficiencyGenerateRequestSchema = z.object({
  userId: z.number(),
  targetExamDate: z.string().optional(),
  studyGoalHours: z.number().optional(),
  preferredStudyTimes: z.array(z.string()).optional(),
})

export const LearningEfficiencyAnalysisSchema = z.object({
  id: z.string(),
  userId: z.number(),
  analysisDate: z.string(),
  overallEfficiency: z.number(),
  studyConsistency: z.number(),
  timeDistribution: z.record(z.string(), z.number()),
  subjectEfficiency: z.record(z.string(), z.number()),
  recommendations: z.array(z.object({
    type: z.string(),
    message: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })),
  predictedScore: z.number().optional(),
  burnoutRisk: z.number().optional(),
  personalizedGoals: z.array(z.object({
    subject: z.string(),
    targetHours: z.number(),
    currentProgress: z.number(),
  })).optional(),
})

// Authentication Schemas
export const SignupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    token: z.string(),
    user: z.object({
      id: z.number(),
      email: z.string(),
      name: z.string(),
      role: z.string(),
      createdAt: z.string(),
    }),
    expiresIn: z.string(),
  }),
})

// Analysis Request Schemas
export const ExamReadinessRequestSchema = z.object({
  examDate: z.string(),
  targetScore: z.number().optional().default(60),
})

export const PerformanceMetricsQuerySchema = z.object({
  userId: z.string().optional(),
  period: z.number().optional().default(30),
})

// Error Response Schemas
export const ValidationErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
})

export const NotFoundErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  path: z.string().optional(),
})

export const UnauthorizedErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
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
      description: '応用情報技術者試験 学習管理システム API - 包括的な学習管理、分析、認証機能を提供',
      contact: {
        name: 'AP Study Project',
        url: 'https://github.com/ap-study-project',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server',
      },
      {
        url: 'https://ap-study-backend.railway.app',
        description: 'Production server',
      },
    ],
    paths: {
      // Authentication Endpoints
      '/api/auth/signup': {
        post: {
          tags: ['Authentication'],
          summary: 'ユーザー登録',
          description: '新しいユーザーアカウントを作成し、JWT認証トークンを発行します',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', minLength: 8, example: 'password123' },
                    name: { type: 'string', example: 'John Doe' },
                  },
                },
                examples: {
                  default: {
                    summary: 'Standard user registration',
                    value: {
                      email: 'student@example.com',
                      password: 'securePassword123',
                      name: 'Study Student',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'ユーザー登録成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'User registered successfully' },
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                          user: { $ref: '#/components/schemas/User' },
                          expiresIn: { type: 'string', example: '24h' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '409': {
              description: 'ユーザーが既に存在',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ConflictError' },
                },
              },
            },
            '400': {
              description: 'バリデーションエラー',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'ユーザーログイン',
          description: 'ユーザー認証を行い、JWT認証トークンを発行します',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', example: 'password123' },
                  },
                },
                examples: {
                  default: {
                    summary: 'Standard login',
                    value: {
                      email: 'student@example.com',
                      password: 'securePassword123',
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'ログイン成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Login successful' },
                      data: {
                        type: 'object',
                        properties: {
                          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                          user: { $ref: '#/components/schemas/User' },
                          expiresIn: { type: 'string', example: '24h' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: '認証失敗',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UnauthorizedError' },
                },
              },
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'ユーザー情報取得',
          description: '認証されたユーザーの詳細情報を取得します',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'ユーザー情報取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          user: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: '認証が必要',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UnauthorizedError' },
                },
              },
            },
          },
        },
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'トークンリフレッシュ',
          description: '有効なJWT認証トークンを新しいトークンに更新します',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'トークンリフレッシュ成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string', example: 'Token refreshed successfully' },
                      data: { $ref: '#/components/schemas/AuthToken' },
                    },
                  },
                },
              },
            },
            '401': {
              description: '無効なトークン',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/UnauthorizedError' },
                },
              },
            },
          },
        },
      },
      // Learning Efficiency Analysis Endpoints
      '/api/learning-efficiency-analysis/generate': {
        post: {
          tags: ['Learning Efficiency Analysis'],
          summary: '学習効率分析実行',
          description: 'ユーザーの学習データを基に効率分析を実行し、パーソナライズされた推奨事項を生成します。ML予測、バーンアウトリスク検出、個人化目標設定を含みます。',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId'],
                  properties: {
                    userId: { type: 'number', example: 1 },
                    targetExamDate: { type: 'string', format: 'date', example: '2024-04-15' },
                    studyGoalHours: { type: 'number', example: 120 },
                    preferredStudyTimes: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['morning', 'evening'],
                    },
                  },
                },
                examples: {
                  comprehensive: {
                    summary: 'Comprehensive analysis request',
                    value: {
                      userId: 1,
                      targetExamDate: '2024-04-15',
                      studyGoalHours: 150,
                      preferredStudyTimes: ['morning', 'evening'],
                    },
                  },
                  basic: {
                    summary: 'Basic analysis request',
                    value: {
                      userId: 1,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: '学習効率分析完了',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/LearningEfficiencyAnalysis' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'リクエストエラー',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
          },
        },
      },
      '/api/learning-efficiency-analysis/user/{userId}': {
        get: {
          tags: ['Learning Efficiency Analysis'],
          summary: 'ユーザー別分析履歴取得',
          description: '指定ユーザーの学習効率分析履歴を取得します',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              example: 1,
            },
          ],
          responses: {
            '200': {
              description: '分析履歴取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/LearningEfficiencyAnalysis' },
                      },
                    },
                  },
                },
              },
            },
            '404': {
              description: '分析結果が見つかりません',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/NotFoundError' },
                },
              },
            },
          },
        },
      },
      '/api/learning-efficiency-analysis/predict/{userId}': {
        get: {
          tags: ['Learning Efficiency Analysis'],
          summary: '予測分析取得',
          description: 'ML分析による学習効率予測と最適化提案を取得します。合格確率、リスク要因、改善提案を含みます。',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              example: 1,
            },
          ],
          responses: {
            '200': {
              description: '予測分析取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          predictedOutcome: { 
                            type: 'string', 
                            enum: ['pass_with_high_score', 'pass_with_good_score', 'borderline_pass', 'likely_fail'],
                            example: 'pass_with_good_score' 
                          },
                          confidenceLevel: { type: 'number', example: 85.7 },
                          riskFactors: {
                            type: 'array',
                            items: { type: 'string' },
                            example: ['inconsistent_study_schedule', 'weak_in_algorithms'],
                          },
                          optimizationSuggestions: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                action: { type: 'string', example: 'increase_algorithm_practice' },
                                expectedImprovement: { type: 'number', example: 12.5 },
                                implementationEffort: { 
                                  type: 'string', 
                                  enum: ['low', 'medium', 'high'], 
                                  example: 'medium' 
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
          },
        },
      },
      '/api/learning-efficiency-analysis/recommendations/{userId}': {
        get: {
          tags: ['Learning Efficiency Analysis'],
          summary: 'パーソナライズド推奨取得',
          description: '個人化された学習推奨事項とアクションプランを取得します。適応的調整機能を含みます。',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'integer' },
              example: 1,
            },
          ],
          responses: {
            '200': {
              description: '推奨事項取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          dailySchedule: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                timeSlot: { type: 'string', example: '09:00-10:30' },
                                subject: { type: 'string', example: 'データベース' },
                                focusArea: { type: 'string', example: 'SQL最適化' },
                                studyMethod: { 
                                  type: 'string', 
                                  enum: ['reading', 'practice_problems', 'video_learning', 'discussion'],
                                  example: 'practice_problems' 
                                },
                              },
                            },
                          },
                          weeklyGoals: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                goal: { type: 'string', example: 'データベース設計の理解向上' },
                                targetHours: { type: 'number', example: 8 },
                                milestones: {
                                  type: 'array',
                                  items: { type: 'string' },
                                  example: ['正規化理論習得', 'インデックス設計'],
                                },
                              },
                            },
                          },
                          adaptiveAdjustments: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                condition: { type: 'string', example: 'if_falling_behind_schedule' },
                                adjustment: { type: 'string', example: 'focus_on_high_priority_topics' },
                                triggerThreshold: { type: 'number', example: 70 },
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
        },
      },
      // Complex Analysis Endpoints
      '/api/analysis/performance-metrics': {
        get: {
          tags: ['Advanced Analysis'],
          summary: '総合学習指標取得',
          description: '学習継続性、効率、成長率、カテゴリバランスなどの包括的な学習指標を取得します',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'query',
              schema: { type: 'string' },
              description: 'ユーザーID（未指定の場合はanonymous）',
              example: 'user123',
            },
            {
              name: 'period',
              in: 'query',
              schema: { type: 'integer', default: 30 },
              description: '分析期間（日数）',
              example: 30,
            },
          ],
          responses: {
            '200': {
              description: '学習指標取得成功',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          period: { type: 'number', example: 30 },
                          studyConsistency: {
                            type: 'object',
                            properties: {
                              study_days: { type: 'number', example: 22 },
                              total_sessions: { type: 'number', example: 45 },
                              avg_session_duration: { type: 'number', example: 38.5 },
                              consistency_rate: { type: 'number', example: 73.3 },
                            },
                          },
                          learningEfficiency: {
                            type: 'object',
                            properties: {
                              avg_score: { type: 'number', example: 78.2 },
                              avg_time_per_question: { type: 'number', example: 1.8 },
                              total_questions_attempted: { type: 'number', example: 650 },
                              avg_total_time: { type: 'number', example: 42.3 },
                            },
                          },
                          growthAnalysis: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                week_start: { type: 'string', format: 'date' },
                                avg_score: { type: 'number' },
                                sessions_count: { type: 'number' },
                                prev_week_score: { type: 'number' },
                                score_change: { type: 'number' },
                              },
                            },
                          },
                          categoryBalance: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                category: { type: 'string', example: 'データベース' },
                                questions_attempted: { type: 'number', example: 145 },
                                accuracy_rate: { type: 'number', example: 0.82 },
                                proportion: { type: 'number', example: 22.3 },
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
        },
      },
      '/api/analysis/exam-readiness': {
        post: {
          tags: ['Advanced Analysis'],
          summary: '試験準備度評価',
          description: '試験日と目標スコアに基づいて現在の準備度を評価し、学習計画を提案します',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['examDate'],
                  properties: {
                    examDate: { type: 'string', format: 'date', example: '2024-04-15' },
                    targetScore: { type: 'number', default: 60, example: 75 },
                  },
                },
                examples: {
                  spring_exam: {
                    summary: 'Spring exam preparation',
                    value: {
                      examDate: '2024-04-21',
                      targetScore: 70,
                    },
                  },
                  fall_exam: {
                    summary: 'Fall exam preparation',
                    value: {
                      examDate: '2024-10-13',
                      targetScore: 80,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: '試験準備度評価完了',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          examDate: { type: 'string', format: 'date' },
                          daysToExam: { type: 'number', example: 45 },
                          targetScore: { type: 'number', example: 75 },
                          currentAbility: {
                            type: 'object',
                            properties: {
                              current_avg_score: { type: 'number', example: 68.5 },
                              total_sessions: { type: 'number', example: 28 },
                              target_achievement_rate: { type: 'number', example: 0.64 },
                            },
                          },
                          categoryReadiness: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                category: { type: 'string', example: 'ネットワーク' },
                                questions_attempted: { type: 'number', example: 85 },
                                accuracy_rate: { type: 'number', example: 0.72 },
                                readiness_level: {
                                  type: 'string',
                                  enum: ['excellent', 'good', 'needs_improvement', 'critical'],
                                  example: 'good',
                                },
                              },
                            },
                          },
                          overallReadiness: {
                            type: 'string',
                            enum: ['excellent', 'good', 'needs_improvement', 'needs_significant_improvement'],
                            example: 'good',
                          },
                          studyRecommendations: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                type: { type: 'string', example: 'daily_study_time' },
                                recommendation: { type: 'string', example: '1日120分の学習を推奨' },
                                priority: { type: 'string', enum: ['high', 'medium', 'low'], example: 'high' },
                              },
                            },
                          },
                          passProbability: { type: 'number', example: 82.5 },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'リクエストエラー',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ValidationError' },
                },
              },
            },
          },
        },
      },
      '/api/analysis/learning-pattern': {
        get: {
          tags: ['Advanced Analysis'],
          summary: '学習パターン分析',
          description: '学習時間帯、頻度、学習量と成果の相関などのパターンを分析し、最適な学習条件を提案します',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'userId',
              in: 'query',
              schema: { type: 'string' },
              description: 'ユーザーID',
              example: 'user123',
            },
          ],
          responses: {
            '200': {
              description: '学習パターン分析完了',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'object',
                        properties: {
                          timePattern: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                study_hour: { type: 'number', example: 9 },
                                session_count: { type: 'number', example: 15 },
                                avg_score: { type: 'number', example: 82.5 },
                                avg_duration: { type: 'number', example: 45.2 },
                              },
                            },
                          },
                          frequencyPattern: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                day_of_week: { type: 'number', example: 1, description: '0:日曜日, 1:月曜日, ...' },
                                session_count: { type: 'number', example: 8 },
                                avg_score: { type: 'number', example: 78.3 },
                              },
                            },
                          },
                          volumePerformanceCorrelation: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                daily_sessions: { type: 'number', example: 2 },
                                daily_questions: { type: 'number', example: 25 },
                                avg_score_for_volume: { type: 'number', example: 79.5 },
                                frequency: { type: 'number', example: 12 },
                              },
                            },
                          },
                          recommendations: {
                            type: 'object',
                            properties: {
                              optimalTimeSlot: { type: 'string', example: '9時台' },
                              optimalDayOfWeek: { type: 'string', example: '月曜日' },
                              recommendedDailyQuestions: { type: 'number', example: 15 },
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
      },
      '/api/study/plan': {
        get: {
          tags: ['Study Plan'],
          summary: '全学習計画取得',
          description: '12週間分の学習計画を取得します',
          security: [{ bearerAuth: [] }],
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
                  schema: { $ref: '#/components/schemas/Error' },
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
          security: [{ bearerAuth: [] }],
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
                        items: { $ref: '#/components/schemas/StudyLog' },
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
          security: [{ bearerAuth: [] }],
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
                examples: {
                  database_study: {
                    summary: 'Database study session',
                    value: {
                      date: '2024-01-15',
                      subject: 'データベース',
                      topics: ['正規化', 'SQL最適化'],
                      studyTime: 120,
                      understanding: 4,
                      memo: 'JOIN句の理解が深まった',
                    },
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
                      data: { $ref: '#/components/schemas/StudyLog' },
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
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT認証トークン。ヘッダー例: Authorization: Bearer <token>',
        },
      },
      schemas: {
        // Base Response Schemas
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Invalid email format' },
                },
              },
            },
          },
        },
        NotFoundError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Resource not found' },
            path: { type: 'string', example: '/api/resource/123' },
          },
        },
        UnauthorizedError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Authentication required' },
            message: { type: 'string', example: 'Invalid or expired token' },
          },
        },
        ConflictError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Resource already exists' },
          },
        },
        // Domain Schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthToken: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            expiresIn: { type: 'string', example: '24h' },
          },
        },
        LearningEfficiencyAnalysis: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'analysis-001' },
            userId: { type: 'number', example: 1 },
            analysisDate: { type: 'string', format: 'date-time' },
            overallEfficiency: { type: 'number', minimum: 0, maximum: 100, example: 78.5 },
            studyConsistency: { type: 'number', minimum: 0, maximum: 100, example: 85.2 },
            timeDistribution: {
              type: 'object',
              additionalProperties: { type: 'number' },
              example: { 'morning': 40, 'afternoon': 35, 'evening': 25 },
            },
            subjectEfficiency: {
              type: 'object',
              additionalProperties: { type: 'number' },
              example: { 'database': 82, 'network': 75, 'security': 68 },
            },
            recommendations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', example: 'time_optimization' },
                  message: { type: 'string', example: '朝の学習時間を増やすことを推奨します' },
                  priority: { type: 'string', enum: ['high', 'medium', 'low'], example: 'high' },
                },
              },
            },
            predictedScore: { type: 'number', example: 72.3 },
            burnoutRisk: { type: 'number', minimum: 0, maximum: 100, example: 15.2 },
            personalizedGoals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  subject: { type: 'string', example: 'database' },
                  targetHours: { type: 'number', example: 30 },
                  currentProgress: { type: 'number', example: 22 },
                },
              },
            },
          },
        },
        StudyLog: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            date: { type: 'string', format: 'date', example: '2024-01-15' },
            subject: { type: 'string', example: 'データベース' },
            topics: {
              type: 'array',
              items: { type: 'string' },
              example: ['正規化', 'SQL最適化'],
            },
            studyTime: { type: 'number', minimum: 0, example: 120 },
            understanding: { type: 'number', minimum: 1, maximum: 5, example: 4 },
            memo: { type: 'string', example: 'JOIN句の理解が深まった' },
            efficiency: { type: 'number', minimum: 0, maximum: 100, example: 85.5 },
          },
        },
        QuizSession: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            userId: { type: 'string', example: 'user123' },
            sessionType: {
              type: 'string',
              enum: ['category', 'random', 'review', 'weak_points'],
              example: 'category',
            },
            category: { type: 'string', example: 'データベース' },
            totalQuestions: { type: 'number', example: 20 },
            correctAnswers: { type: 'number', example: 16 },
            totalTime: { type: 'number', example: 1800 },
            avgTimePerQ: { type: 'number', example: 90 },
            score: { type: 'number', minimum: 0, maximum: 100, example: 80 },
            startedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            isCompleted: { type: 'boolean', example: true },
          },
        },
      },
    },
  }

  // OpenAPI仕様書エンドポイント
  app.get('/doc', (c) => {
    return c.json(openAPISpec)
  })

  // Swagger UI設定 - 本番環境対応
  app.get('/ui', swaggerUI({
    url: '/doc'
  }))

  return app
}

// 共通レスポンスヘルパー
export function createSuccessResponse<T>(data: T) {
  return {
    success: true as const,
    data,
  }
}

export function createErrorResponse(error: string) {
  return {
    success: false as const,
    error,
  }
}