import { ReviewItem, ReviewSession } from "../entities/ReviewSchedule";

export interface IReviewRepository {
  // ReviewItem管理
  saveReviewItem(item: ReviewItem): Promise<ReviewItem>;
  findReviewItemById(id: number): Promise<ReviewItem | null>;
  findReviewItemsByUser(userId?: string): Promise<ReviewItem[]>;
  findDueReviewItems(date: Date, userId?: string): Promise<ReviewItem[]>;
  updateReviewItem(
    id: number,
    updates: Partial<ReviewItem>
  ): Promise<ReviewItem>;
  deleteReviewItem(id: number): Promise<void>;

  // ReviewSession管理
  saveReviewSession(session: ReviewSession): Promise<ReviewSession>;
  findReviewSessionsByUser(userId?: string): Promise<ReviewSession[]>;
  findRecentReviewSessions(
    days: number,
    userId?: string
  ): Promise<ReviewSession[]>;
}
