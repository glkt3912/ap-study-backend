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
    // Fetch study logs within the time range
    const studyLogs = await this.studyLogRepository.findByUserAndDateRange(
      input.userId, 
      input.timeRange.startDate, 
      input.timeRange.endDate
    )

    // Validate that we have data to analyze
    if (studyLogs.length === 0) {
      throw new Error('No study logs found for analysis')
    }

    // Calculate hourly efficiency
    const hourlyEfficiency = this.calculateHourlyEfficiency(studyLogs)
    
    // Calculate subject efficiency
    const subjectEfficiency = this.calculateSubjectEfficiency(studyLogs)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(hourlyEfficiency, subjectEfficiency)
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(hourlyEfficiency, subjectEfficiency)

    const analysis: Omit<LearningEfficiencyAnalysis, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: input.userId,
      analysisDate: new Date(),
      timeRange: input.timeRange,
      hourlyEfficiency,
      subjectEfficiency,
      recommendations,
      overallScore
    }

    return await this.repository.create(analysis)
  }

  async getAnalysisById(id: string): Promise<LearningEfficiencyAnalysis | null> {
    return await this.repository.findById(id)
  }

  async getAnalysesByUser(userId: string): Promise<LearningEfficiencyAnalysis[]> {
    return await this.repository.findByUserId(userId)
  }

  private calculateHourlyEfficiency(studyLogs: any[]): HourlyEfficiency[] {
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

    return Array.from({ length: 24 }, (_, hour) => {
      const data = hourlyData[hour] || { totalTime: 0, totalUnderstanding: 0, completions: 0, attempts: 0 }
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
    })
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
    
    return Math.round((avgHourlyEfficiency * 30 + avgSubjectUnderstanding * 20 + avgCompletionRate * 50))
  }
}
