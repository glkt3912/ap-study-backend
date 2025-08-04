// Domain Entity: Learning Efficiency Analysis
export interface LearningEfficiencyAnalysis {
  id: string
  userId: number
  analysisDate: Date
  timeRange: {
    startDate: Date
    endDate: Date
  }
  hourlyEfficiency: HourlyEfficiency[]
  subjectEfficiency: SubjectEfficiency[]
  recommendations: LearningRecommendation[]
  overallScore: number
  createdAt: Date
  updatedAt: Date
}

export interface HourlyEfficiency {
  hour: number // 0-23
  avgStudyTime: number // minutes
  avgUnderstanding: number // 1-5
  completionRate: number // 0-1
  efficiencyScore: number // calculated metric
}

export interface SubjectEfficiency {
  subject: string
  totalStudyTime: number
  avgUnderstanding: number
  completionRate: number
  difficultyLevel: number
  learningVelocity: number // understanding per hour
}

export interface LearningRecommendation {
  type: 'time_optimization' | 'subject_focus' | 'schedule_adjustment' | 'schedule_optimization' | 'subject_improvement' | 'consistency'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  expectedImprovement: number // percentage
}

export interface CreateLearningEfficiencyAnalysisInput {
  userId: number
  timeRange: {
    startDate: Date
    endDate: Date
  }
}

export interface UpdateLearningEfficiencyAnalysisInput {
  recommendations?: LearningRecommendation[]
}
