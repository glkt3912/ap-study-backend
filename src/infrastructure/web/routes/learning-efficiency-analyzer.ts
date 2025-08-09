// API Routes: Learning Efficiency Analysis
import { Hono } from 'hono'
import { LearningEfficiencyAnalysisUseCase } from '../../../domain/usecases/learning-efficiency-analyzer'

export function createLearningEfficiencyAnalysisRoutes(useCase: LearningEfficiencyAnalysisUseCase) {
  const router = new Hono()

  // GET /analysis/:userId
  router.get('/user/:userId', async (c) => {
    try {
      const userId = c.req.param('userId')
      const analyses = await useCase.getAnalysesByUser(userId ? parseInt(userId) : 0)
      return c.json({ success: true, data: analyses })
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  // GET /analysis/:id
  router.get('/:id', async (c) => {
    try {
      const id = c.req.param('id')
      const analysis = await useCase.getAnalysisById(id)
      if (!analysis) {
        return c.json({ success: false, error: 'Analysis not found' }, 404)
      }
      return c.json({ success: true, data: analysis })
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  // POST /analysis/generate
  router.post('/generate', async (c) => {
    try {
      let body: any = {}
      try {
        body = await c.req.json()
      } catch (jsonError) {
        // Handle empty body or invalid JSON - use default empty object
        console.log("[DEBUG] No JSON body provided, using default empty object")
      }
      
      // For now, return mock data since we don't have real user data
      const mockAnalysis = {
        id: Date.now().toString(),
        userId: body?.userId || 0,
        analysisDate: new Date().toISOString(),
        efficiencyScore: 75,
        recommendations: [
          "定期的な復習スケジュールを作成しましょう",
          "理解度の低い分野に集中して学習しましょう",
          "学習時間を記録して習慣化を図りましょう"
        ],
        insights: {
          strongAreas: ["基礎理論", "データベース"],
          weakAreas: ["ネットワーク", "セキュリティ"],
          timeEfficiency: "良好",
          retentionRate: 0.68
        }
      }
      
      return c.json({ success: true, data: mockAnalysis }, 201)
    } catch (error: any) {
      console.error("[ERROR] learning-efficiency-analysis/generate error:", error)
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  // GET /latest/:userId
  router.get('/latest/:userId', async (c) => {
    try {
      const userId = c.req.param('userId')
      const analysis = await useCase.getLatestAnalysis(userId ? parseInt(userId) : 0)
      if (!analysis) {
        return c.json({ success: false, error: 'No analysis found for user' }, 404)
      }
      return c.json({ success: true, data: analysis })
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  // GET /predict/:userId
  router.get('/predict/:userId', async (c) => {
    try {
      const userId = c.req.param('userId')
      const prediction = await useCase.generatePredictiveAnalysis(userId ? parseInt(userId) : 0)
      return c.json({ success: true, data: prediction })
    } catch (error: any) {
      // 履歴データがない場合は404ではなく、空のデータを返す
      if (error.message.includes('No historical data available')) {
        return c.json({ 
          success: true, 
          data: {
            predictedOutcome: 'insufficient_data',
            confidenceLevel: 0,
            riskFactors: ['学習履歴が不足しています'],
            optimizationSuggestions: [
              {
                action: '定期的な学習を開始してください',
                expectedImprovement: 0,
                implementationEffort: 'low'
              }
            ]
          }
        })
      }
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  // GET /recommendations/:userId
  router.get('/recommendations/:userId', async (c) => {
    try {
      const userId = c.req.param('userId')
      const recommendations = await useCase.generatePersonalizedRecommendations(userId ? parseInt(userId) : 0)
      return c.json({ success: true, data: recommendations })
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  return router
}
