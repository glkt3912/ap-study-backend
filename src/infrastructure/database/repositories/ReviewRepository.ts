import { PrismaClient } from '@prisma/client';
import { IReviewRepository } from 'src/domain/repositories/IReviewRepository.js';
import { ReviewItem, ReviewSession } from 'src/domain/entities/ReviewSchedule.js';

export class ReviewRepository implements IReviewRepository {
  constructor(private prisma: PrismaClient) {}

  async saveReviewItem(item: ReviewItem): Promise<ReviewItem> {
    const data = {
      userId: Number(item.userId) || 0,
      subject: item.subject,
      topic: item.topic,
      lastStudyDate: item.lastStudyDate,
      nextReviewDate: item.nextReviewDate,
      reviewCount: item.reviewCount,
      difficulty: item.difficulty,
      understanding: item.understanding,
      priority: item.priority,
      forgettingCurveStage: item.forgettingCurveStage,
      intervalDays: item.intervalDays,
      isCompleted: item.isCompleted
    };

    if (item.id) {
      const updated = await this.prisma.reviewItem.update({
        where: { id: item.id },
        data
      });
      return this.mapReviewItemToEntity(updated);
    } else {
      const created = await this.prisma.reviewItem.create({
        data
      });
      return this.mapReviewItemToEntity(created);
    }
  }

  async findReviewItemById(id: number): Promise<ReviewItem | null> {
    const item = await this.prisma.reviewItem.findUnique({
      where: { id }
    });
    return item ? this.mapReviewItemToEntity(item) : null;
  }

  async findReviewItemsByUser(userId?: number): Promise<ReviewItem[]> {
    const items = await this.prisma.reviewItem.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { priority: 'desc' }
    });
    return items.map(item => this.mapReviewItemToEntity(item));
  }

  async findDueReviewItems(date: Date, userId?: number): Promise<ReviewItem[]> {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const items = await this.prisma.reviewItem.findMany({
      where: {
        userId: userId ? userId : undefined,
        nextReviewDate: {
          lte: endOfDay
        },
        isCompleted: false
      },
      orderBy: { priority: 'desc' }
    });
    return items.map(item => this.mapReviewItemToEntity(item));
  }

  async updateReviewItem(id: number, updates: Partial<ReviewItem>): Promise<ReviewItem> {
    const updated = await this.prisma.reviewItem.update({
      where: { id },
      data: updates
    });
    return this.mapReviewItemToEntity(updated);
  }

  async deleteReviewItem(id: number): Promise<void> {
    await this.prisma.reviewItem.delete({
      where: { id }
    });
  }

  async saveReviewSession(session: ReviewSession): Promise<ReviewSession> {
    const data = {
      userId: Number(session.userId) || 0,
      sessionDate: session.sessionDate,
      totalItems: session.totalItems,
      completedItems: session.completedItems,
      sessionDuration: session.sessionDuration,
      averageUnderstanding: session.averageUnderstanding
    };

    if (session.id) {
      const updated = await this.prisma.reviewSession.update({
        where: { id: session.id },
        data
      });
      return this.mapSessionToEntity(updated);
    } else {
      const created = await this.prisma.reviewSession.create({
        data
      });
      return this.mapSessionToEntity(created);
    }
  }

  async findReviewSessionsByUser(userId?: number): Promise<ReviewSession[]> {
    const sessions = await this.prisma.reviewSession.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { sessionDate: 'desc' }
    });
    return sessions.map(session => this.mapSessionToEntity(session));
  }

  async findRecentReviewSessions(days: number, userId?: number): Promise<ReviewSession[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.prisma.reviewSession.findMany({
      where: {
        userId: userId ? userId : undefined,
        sessionDate: {
          gte: startDate
        }
      },
      orderBy: { sessionDate: 'desc' }
    });
    return sessions.map(session => this.mapSessionToEntity(session));
  }

  private mapReviewItemToEntity(data: any): ReviewItem {
    return {
      id: data.id,
      userId: data.userId,
      subject: data.subject,
      topic: data.topic,
      lastStudyDate: data.lastStudyDate,
      nextReviewDate: data.nextReviewDate,
      reviewCount: data.reviewCount,
      difficulty: data.difficulty,
      understanding: data.understanding,
      priority: data.priority,
      forgettingCurveStage: data.forgettingCurveStage,
      intervalDays: data.intervalDays,
      isCompleted: data.isCompleted,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }

  private mapSessionToEntity(data: any): ReviewSession {
    return {
      id: data.id,
      userId: data.userId,
      sessionDate: data.sessionDate,
      reviewItems: [], // セッション詳細は別途取得
      totalItems: data.totalItems,
      completedItems: data.completedItems,
      sessionDuration: data.sessionDuration,
      averageUnderstanding: data.averageUnderstanding,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    };
  }
}