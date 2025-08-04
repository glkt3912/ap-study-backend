import { PrismaClient } from '@prisma/client';
import { IAnalysisRepository } from 'src/domain/repositories/IAnalysisRepository.js';
import { AnalysisResult } from 'src/domain/entities/AnalysisResult.js';

export class AnalysisRepository implements IAnalysisRepository {
  constructor(private prisma: PrismaClient) {}

  async save(analysisResult: AnalysisResult): Promise<AnalysisResult> {
    const data = {
      userId: analysisResult.userId || 0,
      analysisDate: analysisResult.analysisDate,
      studyPattern: analysisResult.studyPattern,
      weaknessAnalysis: analysisResult.weaknessAnalysis,
      studyRecommendation: analysisResult.studyRecommendation,
      overallScore: analysisResult.overallScore
    };

    if (analysisResult.id) {
      const updated = await this.prisma.analysisResult.update({
        where: { id: analysisResult.id },
        data
      });
      return this.mapToEntity(updated);
    } else {
      const created = await this.prisma.analysisResult.create({
        data
      });
      return this.mapToEntity(created);
    }
  }

  async findLatest(userId?: string): Promise<AnalysisResult | null> {
    const result = await this.prisma.analysisResult.findFirst({
      where: userId ? { userId } : undefined,
      orderBy: { analysisDate: 'desc' }
    });

    return result ? this.mapToEntity(result) : null;
  }

  async findByDateRange(startDate: Date, endDate: Date, userId?: string): Promise<AnalysisResult[]> {
    const results = await this.prisma.analysisResult.findMany({
      where: {
        userId: userId ? userId : undefined,
        analysisDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { analysisDate: 'desc' }
    });

    return results.map(result => this.mapToEntity(result));
  }

  async delete(id: number): Promise<void> {
    await this.prisma.analysisResult.delete({
      where: { id }
    });
  }

  private mapToEntity(data: any): AnalysisResult {
    return {
      id: data.id,
      userId: data.userId,
      analysisDate: data.analysisDate,
      studyPattern: JSON.parse(data.studyPattern),
      weaknessAnalysis: JSON.parse(data.weaknessAnalysis),
      studyRecommendation: JSON.parse(data.studyRecommendation),
      overallScore: data.overallScore,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }
}