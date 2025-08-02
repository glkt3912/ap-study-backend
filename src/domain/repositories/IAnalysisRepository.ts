import { AnalysisResult } from "../entities/AnalysisResult";

export interface IAnalysisRepository {
  save(analysisResult: AnalysisResult): Promise<AnalysisResult>;
  findLatest(userId?: string): Promise<AnalysisResult | null>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<AnalysisResult[]>;
  delete(id: number): Promise<void>;
}
