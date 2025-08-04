import { AnalysisResult } from "src/domain/entities/AnalysisResult.js";

export interface IAnalysisRepository {
  save(analysisResult: AnalysisResult): Promise<AnalysisResult>;
  findLatest(userId?: number): Promise<AnalysisResult | null>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<AnalysisResult[]>;
  delete(id: number): Promise<void>;
}
