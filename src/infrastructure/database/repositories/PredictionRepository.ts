import { PrismaClient } from '@prisma/client';
import { IPredictionRepository } from 'src/domain/repositories/IPredictionRepository.js';
import { PredictionResult } from 'src/domain/entities/PredictionResult.js';

export class PredictionRepository implements IPredictionRepository {
  constructor(private prisma: PrismaClient) {}

  async save(predictionResult: PredictionResult): Promise<PredictionResult> {
    const data = {
      userId: predictionResult.userId,
      predictionDate: predictionResult.predictionDate,
      examDate: predictionResult.examDate,
      passProbability: JSON.stringify(predictionResult.passProbability),
      studyTimePrediction: JSON.stringify(predictionResult.studyTimePrediction),
      scorePrediction: JSON.stringify(predictionResult.scorePrediction),
      examReadiness: JSON.stringify(predictionResult.examReadiness),
      modelVersion: predictionResult.modelVersion
    };

    if (predictionResult.id) {
      const updated = await this.prisma.predictionResult.update({
        where: { id: predictionResult.id },
        data
      });
      return this.mapToEntity(updated);
    } else {
      const created = await this.prisma.predictionResult.create({
        data
      });
      return this.mapToEntity(created);
    }
  }

  async findLatest(userId?: string): Promise<PredictionResult | null> {
    const result = await this.prisma.predictionResult.findFirst({
      where: userId ? { userId } : undefined,
      orderBy: { predictionDate: 'desc' }
    });

    return result ? this.mapToEntity(result) : null;
  }

  async findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<PredictionResult[]> {
    const results = await this.prisma.predictionResult.findMany({
      where: {
        userId: userId ? userId : undefined,
        predictionDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { predictionDate: 'desc' }
    });

    return results.map(result => this.mapToEntity(result));
  }

  async findByExamDate(examDate: Date, userId?: string): Promise<PredictionResult[]> {
    const results = await this.prisma.predictionResult.findMany({
      where: {
        userId: userId ? userId : undefined,
        examDate: examDate
      },
      orderBy: { predictionDate: 'desc' }
    });

    return results.map(result => this.mapToEntity(result));
  }

  async delete(id: number): Promise<void> {
    await this.prisma.predictionResult.delete({
      where: { id }
    });
  }

  private mapToEntity(data: any): PredictionResult {
    return {
      id: data.id,
      userId: data.userId,
      predictionDate: data.predictionDate,
      examDate: data.examDate,
      passProbability: JSON.parse(data.passProbability),
      studyTimePrediction: JSON.parse(data.studyTimePrediction),
      scorePrediction: JSON.parse(data.scorePrediction),
      examReadiness: JSON.parse(data.examReadiness),
      modelVersion: data.modelVersion,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }
}