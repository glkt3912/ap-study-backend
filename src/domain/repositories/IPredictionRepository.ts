import { PredictionResult } from "src/domain/entities/PredictionResult.js";

export interface IPredictionRepository {
  save(predictionResult: PredictionResult): Promise<PredictionResult>;
  findLatest(userId?: number): Promise<PredictionResult | null>;
  findByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: number
  ): Promise<PredictionResult[]>;
  findByExamDate(examDate: Date, userId?: number): Promise<PredictionResult[]>;
  delete(id: number): Promise<void>;
}
