import { PredictionResult } from "src/domain/entities/PredictionResult.js";

export interface IPredictionRepository {
  save(predictionResult: PredictionResult): Promise<PredictionResult>;
  findLatest(userId?: string): Promise<PredictionResult | null>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<PredictionResult[]>;
  findByExamDate(examDate: Date, userId?: string): Promise<PredictionResult[]>;
  delete(id: number): Promise<void>;
}
