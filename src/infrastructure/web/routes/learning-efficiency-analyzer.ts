// API Routes: Learning Efficiency Analysis
import { Hono } from 'hono'
import { LearningEfficiencyAnalysisUseCase } from '../../../domain/usecases/learning-efficiency-analyzer'

export function createLearningEfficiencyAnalysisRoutes(useCase: LearningEfficiencyAnalysisUseCase) {
  const router = new Hono()

  // GET /analysis/:userId
  router.get('/user/:userId', async (c) => {
    try {
      const userId = c.req.param('userId')
      const analyses = await useCase.getAnalysesByUser(userId)
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
      const body = await c.req.json()
      const analysis = await useCase.generateAnalysis(body)
      return c.json({ success: true, data: analysis }, 201)
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500)
    }
  })

  return router
}
