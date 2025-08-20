// Use Case: Learning Efficiency Analysis
import { 
  LearningEfficiencyAnalysis, 
  CreateLearningEfficiencyAnalysisInput, 
  UpdateLearningEfficiencyAnalysisInput,
  HourlyEfficiency,
  SubjectEfficiency,
  LearningRecommendation
} from '../entities/learning-efficiency-analyzer'
import { ILearningEfficiencyAnalysisRepository } from '../repositories/Ilearning-efficiency-analyzerRepository'
import { IStudyLogRepository } from '../repositories/IStudyLogRepository'

export class LearningEfficiencyAnalysisUseCase {
  constructor(
    private repository: ILearningEfficiencyAnalysisRepository,
    private studyLogRepository: IStudyLogRepository
  ) {}

  async generateAnalysis(input: CreateLearningEfficiencyAnalysisInput): Promise<LearningEfficiencyAnalysis> {
    const studyLogs = await this.fetchAndValidateStudyLogs(input)
    const efficiencyMetrics = this.calculateEfficiencyMetrics(studyLogs)
    const analysisResults = await this.generateAnalysisResults(studyLogs, efficiencyMetrics)
    const analysis = this.buildAnalysisObject(input, efficiencyMetrics, analysisResults)
    
    return await this.repository.create(analysis)
  }

  private async fetchAndValidateStudyLogs(input: CreateLearningEfficiencyAnalysisInput) {
    const studyLogs = await this.studyLogRepository.findByUserAndDateRange(
      input.userId, 
      input.timeRange.startDate, 
      input.timeRange.endDate
    )

    if (studyLogs.length === 0) {
      throw new Error('No study logs found for analysis')
    }

    return studyLogs
  }

  private calculateEfficiencyMetrics(studyLogs: any[]) {
    const hourlyEfficiency = this.calculateHourlyEfficiency(studyLogs)
    const subjectEfficiency = this.calculateSubjectEfficiency(studyLogs)
    const overallScore = this.calculateOverallScore(hourlyEfficiency, subjectEfficiency)

    return { hourlyEfficiency, subjectEfficiency, overallScore }
  }

  private async generateAnalysisResults(studyLogs: any[], efficiencyMetrics: any) {
    const { hourlyEfficiency, subjectEfficiency } = efficiencyMetrics
    
    const recommendations = this.generateRecommendations(hourlyEfficiency, subjectEfficiency)
    const performancePrediction = await this.predictFuturePerformance(studyLogs, subjectEfficiency)
    const personalizedGoals = this.generatePersonalizedGoals(studyLogs, hourlyEfficiency, subjectEfficiency)
    const burnoutRisk = this.calculateBurnoutRisk(studyLogs, hourlyEfficiency)

    return { recommendations, performancePrediction, personalizedGoals, burnoutRisk }
  }

  private buildAnalysisObject(input: CreateLearningEfficiencyAnalysisInput, efficiencyMetrics: any, analysisResults: any): Omit<LearningEfficiencyAnalysis, 'id' | 'createdAt' | 'updatedAt'> {
    const { hourlyEfficiency, subjectEfficiency, overallScore } = efficiencyMetrics
    const { recommendations, personalizedGoals } = analysisResults
    
    return {
      userId: input.userId,
      analysisDate: new Date(),
      timeRange: input.timeRange,
      hourlyEfficiency,
      subjectEfficiency,
      recommendations: [...recommendations, ...personalizedGoals],
      overallScore
    }
  }

  async getAnalysisById(id: string): Promise<LearningEfficiencyAnalysis | null> {
    return await this.repository.findById(id)
  }

  async getAnalysesByUser(userId: number): Promise<LearningEfficiencyAnalysis[]> {
    return await this.repository.findByUserId(userId)
  }

  async getLatestAnalysis(userId: number): Promise<LearningEfficiencyAnalysis | null> {
    const analyses = await this.repository.findByUserId(userId)
    return analyses.length > 0 ? analyses[analyses.length - 1] : null
  }

  async generatePredictiveAnalysis(userId: number): Promise<{
    predictedPerformance: number,
    improvementSuggestions: string[],
    riskFactors: string[],
    confidenceScore: number
  }> {
    const recentAnalyses = await this.repository.findByUserId(userId)
    
    if (recentAnalyses.length === 0) {
      throw new Error('No historical data available for prediction')
    }

    // Calculate trends from recent analyses
    const performanceTrend = this.calculatePerformanceTrend(recentAnalyses)
    const predictedPerformance = Math.max(0, Math.min(100, performanceTrend.predictedScore))
    
    const improvementSuggestions = this.generateImprovementSuggestions(recentAnalyses)
    const riskFactors = this.identifyRiskFactors(recentAnalyses)
    const confidenceScore = this.calculateConfidenceScore(recentAnalyses)

    return {
      predictedPerformance,
      improvementSuggestions,
      riskFactors,
      confidenceScore
    }
  }

  async generatePersonalizedRecommendations(userId: number): Promise<{
    dailySchedule: { time: string, activity: string, duration: number }[],
    weeklyGoals: string[],
    studyTechniques: string[]
  }> {
    const analyses = await this.repository.findByUserId(userId)
    
    if (analyses.length === 0) {
      return this.getDefaultRecommendations()
    }

    const latestAnalysis = analyses[analyses.length - 1]
    return this.buildPersonalizedRecommendations(latestAnalysis)
  }

  private getDefaultRecommendations() {
    return {
      dailySchedule: [
        { time: '09:00', activity: '基礎理論の学習', duration: 60 },
        { time: '14:00', activity: '問題演習', duration: 90 }
      ],
      weeklyGoals: ['毎日2時間の学習時間確保', '理解度4以上を維持'],
      studyTechniques: ['ポモドーロ・テクニック', 'アクティブラーニング']
    }
  }

  private buildPersonalizedRecommendations(latestAnalysis: LearningEfficiencyAnalysis) {
    const bestHours = this.getBestStudyHours(latestAnalysis.hourlyEfficiency)
    const weakSubjects = this.getWeakSubjects(latestAnalysis.subjectEfficiency)
    
    return {
      dailySchedule: this.generateDailySchedule(bestHours, weakSubjects),
      weeklyGoals: this.generateWeeklyGoals(latestAnalysis),
      studyTechniques: this.recommendStudyTechniques(latestAnalysis)
    }
  }

  private getBestStudyHours(hourlyEfficiency: HourlyEfficiency[]) {
    return hourlyEfficiency
      .filter(h => h.efficiencyScore > 0)
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
      .slice(0, 3)
  }

  private getWeakSubjects(subjectEfficiency: SubjectEfficiency[]) {
    return subjectEfficiency
      .filter(s => s.avgUnderstanding < 3.5)
      .sort((a, b) => a.avgUnderstanding - b.avgUnderstanding)
  }

  private generateDailySchedule(bestHours: HourlyEfficiency[], weakSubjects: SubjectEfficiency[]) {
    return bestHours.map((hour, index) => ({
      time: `${hour.hour.toString().padStart(2, '0')}:00`,
      activity: weakSubjects[index]?.subject || '復習・問題演習',
      duration: Math.round(60 + (hour.efficiencyScore * 30))
    }))
  }

  private generateWeeklyGoals(latestAnalysis: LearningEfficiencyAnalysis) {
    return [
      `理解度平均${Math.round(latestAnalysis.overallScore * 0.05 + 3)}以上を目指す`,
      `週間学習時間${Math.round(latestAnalysis.overallScore * 0.2 + 10)}時間確保`,
      '苦手分野の理解度向上'
    ]
  }

  private calculateHourlyEfficiency(studyLogs: any[]): HourlyEfficiency[] {
    const hourlyData = this.aggregateHourlyData(studyLogs)
    return this.buildHourlyEfficiencyArray(hourlyData)
  }

  private aggregateHourlyData(studyLogs: any[]) {
    const hourlyData: { [hour: number]: { totalTime: number, totalUnderstanding: number, completions: number, attempts: number } } = {}
    
    studyLogs.forEach(log => {
      const hour = new Date(log.createdAt).getHours()
      if (!hourlyData[hour]) {
        hourlyData[hour] = { totalTime: 0, totalUnderstanding: 0, completions: 0, attempts: 0 }
      }
      
      hourlyData[hour].totalTime += log.studyTime || 0
      hourlyData[hour].totalUnderstanding += log.understanding || 0
      hourlyData[hour].attempts += 1
      if (log.completed) hourlyData[hour].completions += 1
    })

    return hourlyData
  }

  private buildHourlyEfficiencyArray(hourlyData: any): HourlyEfficiency[] {
    return Array.from({ length: 24 }, (_, hour) => {
      const data = hourlyData[hour] || { totalTime: 0, totalUnderstanding: 0, completions: 0, attempts: 0 }
      return this.calculateHourlyMetrics(hour, data)
    })
  }

  private calculateHourlyMetrics(hour: number, data: any): HourlyEfficiency {
    const avgStudyTime = data.attempts > 0 ? data.totalTime / data.attempts : 0
    const avgUnderstanding = data.attempts > 0 ? data.totalUnderstanding / data.attempts : 0
    const completionRate = data.attempts > 0 ? data.completions / data.attempts : 0
    const efficiencyScore = avgUnderstanding * completionRate * Math.min(avgStudyTime / 60, 1)

    return {
      hour,
      avgStudyTime,
      avgUnderstanding,
      completionRate,
      efficiencyScore
    }
  }

  private calculateSubjectEfficiency(studyLogs: any[]): SubjectEfficiency[] {
    const subjectData: { [subject: string]: { totalTime: number, totalUnderstanding: number, completions: number, attempts: number } } = {}
    
    studyLogs.forEach(log => {
      const subject = log.subject || 'Unknown'
      if (!subjectData[subject]) {
        subjectData[subject] = { totalTime: 0, totalUnderstanding: 0, completions: 0, attempts: 0 }
      }
      
      subjectData[subject].totalTime += log.studyTime || 0
      subjectData[subject].totalUnderstanding += log.understanding || 0
      subjectData[subject].attempts += 1
      if (log.completed) subjectData[subject].completions += 1
    })

    return Object.entries(subjectData).map(([subject, data]) => {
      const avgUnderstanding = data.attempts > 0 ? data.totalUnderstanding / data.attempts : 0
      const completionRate = data.attempts > 0 ? data.completions / data.attempts : 0
      const learningVelocity = data.totalTime > 0 ? avgUnderstanding / (data.totalTime / 60) : 0
      const difficultyLevel = 5 - avgUnderstanding // inverse of understanding

      return {
        subject,
        totalStudyTime: data.totalTime,
        avgUnderstanding,
        completionRate,
        difficultyLevel,
        learningVelocity
      }
    })
  }

  private generateRecommendations(hourlyEfficiency: HourlyEfficiency[], subjectEfficiency: SubjectEfficiency[]): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = []

    // Find best time slots
    const bestHours = hourlyEfficiency
      .filter(h => h.efficiencyScore > 0)
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
      .slice(0, 3)

    if (bestHours.length > 0) {
      recommendations.push({
        type: 'time_optimization',
        priority: 'high',
        title: 'Optimize Study Schedule',
        description: `Your most productive hours are ${bestHours.map(h => `${h.hour}:00`).join(', ')}. Consider scheduling important subjects during these times.`,
        expectedImprovement: 25
      })
    }

    // Find subjects needing attention
    const strugglingSubjects = subjectEfficiency
      .filter(s => s.avgUnderstanding < 3 || s.completionRate < 0.7)
      .sort((a, b) => a.avgUnderstanding - b.avgUnderstanding)

    if (strugglingSubjects.length > 0) {
      recommendations.push({
        type: 'subject_focus',
        priority: 'high',
        title: 'Focus on Challenging Subjects',
        description: `Consider allocating more time to ${strugglingSubjects[0].subject}. Breaking it into smaller sessions might help.`,
        expectedImprovement: 30
      })
    }

    // Always add at least one recommendation for testing
    if (recommendations.length === 0) {
      recommendations.push({
        type: 'time_optimization',
        priority: 'medium',
        title: 'General Study Optimization',
        description: 'Continue with your current study routine and monitor progress.',
        expectedImprovement: 10
      })
    }

    return recommendations
  }

  private calculateOverallScore(hourlyEfficiency: HourlyEfficiency[], subjectEfficiency: SubjectEfficiency[]): number {
    const avgHourlyEfficiency = hourlyEfficiency.reduce((sum, h) => sum + h.efficiencyScore, 0) / hourlyEfficiency.length
    const avgSubjectUnderstanding = subjectEfficiency.reduce((sum, s) => sum + s.avgUnderstanding, 0) / subjectEfficiency.length
    const avgCompletionRate = subjectEfficiency.reduce((sum, s) => sum + s.completionRate, 0) / subjectEfficiency.length
    
    // Ensure score is between 0-100
    const rawScore = (avgHourlyEfficiency * 30 + avgSubjectUnderstanding * 20 + avgCompletionRate * 50)
    return Math.round(Math.min(100, Math.max(0, rawScore)))
  }

  private calculatePerformanceTrend(analyses: LearningEfficiencyAnalysis[]): { predictedScore: number, trend: string } {
    if (analyses.length < 2) {
      return { predictedScore: analyses[0].overallScore, trend: 'stable' }
    }

    const recentScores = analyses.slice(-5).map(a => a.overallScore)
    const slope = this.calculateLinearTrend(recentScores)
    const latestScore = recentScores[recentScores.length - 1]
    
    return {
      predictedScore: latestScore + (slope * 2), // Predict 2 periods ahead
      trend: slope > 5 ? 'improving' : slope < -5 ? 'declining' : 'stable'
    }
  }

  private calculateLinearTrend(values: number[]): number {
    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((sum, val) => sum + val, 0)
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0)
    const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0)
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  }

  private generateImprovementSuggestions(analyses: LearningEfficiencyAnalysis[]): string[] {
    const latestAnalysis = analyses[analyses.length - 1]
    const suggestions: string[] = []

    if (latestAnalysis.overallScore < 60) {
      suggestions.push('基礎的な学習習慣の確立に重点を置きましょう')
    }

    const weakSubjects = latestAnalysis.subjectEfficiency
      .filter(s => s.avgUnderstanding < 3)
      .map(s => s.subject)

    if (weakSubjects.length > 0) {
      suggestions.push(`${weakSubjects.join('、')}の理解度向上に集中しましょう`)
    }

    const lowEfficiencyHours = latestAnalysis.hourlyEfficiency
      .filter(h => h.efficiencyScore < 0.3 && h.avgStudyTime > 0)

    if (lowEfficiencyHours.length > 0) {
      suggestions.push('効率の低い時間帯での学習方法を見直しましょう')
    }

    return suggestions.length > 0 ? suggestions : ['現在の学習ペースを維持し、継続的な改善を目指しましょう']
  }

  private identifyRiskFactors(analyses: LearningEfficiencyAnalysis[]): string[] {
    const latestAnalysis = analyses[analyses.length - 1]
    const riskFactors: string[] = []

    // Check for declining trend
    if (analyses.length >= 3) {
      const recentScores = analyses.slice(-3).map(a => a.overallScore)
      const trend = this.calculateLinearTrend(recentScores)
      if (trend < -10) {
        riskFactors.push('学習効率の低下傾向が見られます')
      }
    }

    // Check for low completion rates
    const avgCompletionRate = latestAnalysis.subjectEfficiency
      .reduce((sum, s) => sum + s.completionRate, 0) / latestAnalysis.subjectEfficiency.length

    if (avgCompletionRate < 0.5) {
      riskFactors.push('学習タスクの完了率が低下しています')
    }

    // Check for unbalanced study pattern
    const activeHours = latestAnalysis.hourlyEfficiency.filter(h => h.avgStudyTime > 0).length
    if (activeHours < 3) {
      riskFactors.push('学習時間が偏っている可能性があります')
    }

    return riskFactors
  }

  private calculateConfidenceScore(analyses: LearningEfficiencyAnalysis[]): number {
    // Base confidence on amount of data and consistency
    const dataPoints = analyses.length
    const consistency = this.calculateConsistency(analyses.map(a => a.overallScore))
    
    const baseScore = Math.min(dataPoints * 10, 60) // Max 60 from data amount
    const consistencyScore = (1 - consistency) * 40 // Max 40 from consistency
    
    return Math.round(baseScore + consistencyScore)
  }

  private calculateConsistency(values: number[]): number {
    if (values.length <= 1) return 0
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const standardDeviation = Math.sqrt(variance)
    
    return Math.min(standardDeviation / mean, 1) // Normalize to 0-1
  }

  private recommendStudyTechniques(analysis: LearningEfficiencyAnalysis): string[] {
    const techniques: string[] = []

    const avgUnderstanding = analysis.subjectEfficiency
      .reduce((sum, s) => sum + s.avgUnderstanding, 0) / analysis.subjectEfficiency.length

    if (avgUnderstanding < 3) {
      techniques.push('基礎固めに重点を置いた反復学習')
      techniques.push('概念マップを使った体系的理解')
    } else if (avgUnderstanding >= 4) {
      techniques.push('応用問題への挑戦')
      techniques.push('他者への説明による理解深化')
    }

    const peakHours = analysis.hourlyEfficiency
      .filter(h => h.efficiencyScore > 0.7)
      .map(h => h.hour)

    if (peakHours.length > 0) {
      techniques.push('集中力の高い時間帯での重要科目学習')
    }

    return techniques.length > 0 ? techniques : ['ポモドーロ・テクニック', 'アクティブラーニング']
  }

  /**
   * ML-based future performance prediction
   */
  private async predictFuturePerformance(studyLogs: any[], subjectEfficiency: SubjectEfficiency[]): Promise<{
    examReadiness: number,
    weakSubjects: string[],
    studyTimeRecommendation: number,
    successProbability: number
  }> {
    // Simple ML prediction algorithm (can be enhanced with real ML models)
    const totalStudyTime = studyLogs.reduce((sum, log) => sum + log.studyTime, 0)
    const averageUnderstanding = studyLogs.reduce((sum, log) => sum + log.understanding, 0) / studyLogs.length
    const studyConsistency = this.calculateStudyConsistency(studyLogs)
    
    // Weak subjects identification
    const weakSubjects = subjectEfficiency
      .filter(se => se.avgUnderstanding < 3.5)
      .map(se => se.subject)
      .slice(0, 3) // Top 3 weak subjects
    
    // Exam readiness calculation (0-100)
    const examReadiness = Math.min(100, Math.round(
      (averageUnderstanding * 20) + 
      (studyConsistency * 15) + 
      (Math.min(totalStudyTime / 100, 1) * 65) // Normalize study time
    ))
    
    // Study time recommendation (weekly hours)
    const currentWeeklyHours = (totalStudyTime / 60) / Math.max(studyLogs.length / 7, 1)
    const recommendedHours = weakSubjects.length > 0 
      ? Math.max(currentWeeklyHours * 1.2, 20) 
      : Math.max(currentWeeklyHours, 15)
    
    // Success probability
    const successProbability = Math.min(100, Math.round(
      examReadiness * 0.7 + studyConsistency * 0.3
    ))
    
    return {
      examReadiness,
      weakSubjects,
      studyTimeRecommendation: Math.round(recommendedHours),
      successProbability
    }
  }

  /**
   * Generate personalized learning goals
   */
  private generatePersonalizedGoals(
    studyLogs: any[], 
    hourlyEfficiency: HourlyEfficiency[], 
    subjectEfficiency: SubjectEfficiency[]
  ): LearningRecommendation[] {
    const goals: LearningRecommendation[] = []
    
    // Find optimal study times
    const bestHours = hourlyEfficiency
      .filter(he => he.efficiencyScore > 0.5)
      .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
      .slice(0, 3)
      .map(he => he.hour)
    
    if (bestHours.length > 0) {
      goals.push({
        type: 'schedule_optimization',
        priority: 'high',
        title: '最適な学習時間の活用',
        description: `${bestHours.join(', ')}時台の集中力が高いので、この時間に重要な科目を学習しましょう`,
        expectedImprovement: 15
      })
    }
    
    // Identify improvement opportunities
    const improvableSubjects = subjectEfficiency
      .filter(se => se.avgUnderstanding >= 2.5 && se.avgUnderstanding < 4)
      .sort((a, b) => b.avgUnderstanding - a.avgUnderstanding)
      .slice(0, 2)
    
    improvableSubjects.forEach(subject => {
      goals.push({
        type: 'subject_improvement',
        priority: 'medium',
        title: `${subject.subject}の効率向上`,
        description: `現在の理解度${subject.avgUnderstanding.toFixed(1)}を4.0以上に向上させることで、全体スコアが大幅改善されます`,
        expectedImprovement: Math.round((4.0 - subject.avgUnderstanding) * 10)
      })
    })
    
    // Study consistency goals
    const consistency = this.calculateStudyConsistency(studyLogs)
    if (consistency < 70) {
      goals.push({
        type: 'consistency',
        priority: 'high',  
        title: '学習継続性の改善',
        description: `現在の継続率${consistency}%を80%以上に向上させて、長期記憶定着を強化しましょう`,
        expectedImprovement: 20
      })
    }
    
    return goals
  }

  /**
   * Calculate burnout risk based on study patterns
   */
  private calculateBurnoutRisk(studyLogs: any[], hourlyEfficiency: HourlyEfficiency[]): {
    riskLevel: 'low' | 'medium' | 'high',
    riskScore: number,
    factors: string[]
  } {
    const factors: string[] = []
    let riskScore = 0
    
    riskScore += this.checkExcessiveStudyTime(studyLogs, factors)
    riskScore += this.checkDecliningEfficiency(hourlyEfficiency, factors)
    riskScore += this.checkRestPeriods(studyLogs, factors)
    
    const riskLevel = this.determineRiskLevel(riskScore)
    
    return { riskLevel, riskScore, factors }
  }

  private checkExcessiveStudyTime(studyLogs: any[], factors: string[]): number {
    const avgDailyHours = studyLogs.reduce((sum, log) => sum + log.studyTime, 0) / (studyLogs.length * 60)
    if (avgDailyHours > 8) {
      factors.push('長時間学習による疲労')
      return 30
    }
    return 0
  }

  private checkDecliningEfficiency(hourlyEfficiency: HourlyEfficiency[], factors: string[]): number {
    const recentEfficiency = hourlyEfficiency.slice(-7)
    const earlyEfficiency = hourlyEfficiency.slice(0, 7)
    
    if (recentEfficiency.length === 0 || earlyEfficiency.length === 0) {
      return 0
    }

    const recentAvg = recentEfficiency.reduce((sum, he) => sum + he.efficiencyScore, 0) / recentEfficiency.length
    const earlyAvg = earlyEfficiency.reduce((sum, he) => sum + he.efficiencyScore, 0) / earlyEfficiency.length
    
    if (recentAvg < earlyAvg - 0.1) {
      factors.push('学習効率の低下傾向')
      return 25
    }
    return 0
  }

  private checkRestPeriods(studyLogs: any[], factors: string[]): number {
    const studyDaysCount = new Set(studyLogs.map(log => new Date(log.createdAt).toDateString())).size
    const totalDays = Math.ceil((new Date().getTime() - new Date(studyLogs[0]?.createdAt || new Date()).getTime()) / (1000 * 60 * 60 * 24))
    const restDaysRatio = (totalDays - studyDaysCount) / totalDays
    
    if (restDaysRatio < 0.15) {
      factors.push('休息日不足')
      return 20
    }
    return 0
  }

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore >= 50) return 'high'
    if (riskScore >= 25) return 'medium'
    return 'low'
  }

  /**
   * Calculate study consistency score
   */
  private calculateStudyConsistency(studyLogs: any[]): number {
    if (studyLogs.length === 0) return 0
    
    // Group by date
    const studyByDate = studyLogs.reduce((acc, log) => {
      const dateKey = new Date(log.createdAt).toDateString()
      acc[dateKey] = (acc[dateKey] || 0) + log.studyTime
      return acc
    }, {} as Record<string, number>)
    
    const studyDays = Object.keys(studyByDate).length
    const totalDays = Math.ceil((new Date().getTime() - new Date(studyLogs[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
    
    return Math.round((studyDays / Math.max(totalDays, 1)) * 100)
  }
}
