import { AnalysisResult } from "src/domain/entities/AnalysisResult.js";

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
