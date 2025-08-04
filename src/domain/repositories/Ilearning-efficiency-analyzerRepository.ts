// Repository Interface: Learning Efficiency Analysis
import { 
  LearningEfficiencyAnalysis, 
  CreateLearningEfficiencyAnalysisInput, 
  UpdateLearningEfficiencyAnalysisInput 
} from '../entities/learning-efficiency-analyzer'

export interface ILearningEfficiencyAnalysisRepository {
  findById(id: string): Promise<LearningEfficiencyAnalysis | null>
  findByUserId(userId: string): Promise<LearningEfficiencyAnalysis[]>
  create(input: Omit<LearningEfficiencyAnalysis, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningEfficiencyAnalysis>
  update(id: string, input: UpdateLearningEfficiencyAnalysisInput): Promise<LearningEfficiencyAnalysis>
  delete(id: string): Promise<void>
}
