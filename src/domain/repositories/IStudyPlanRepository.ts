import { StudyPlan, CreateStudyPlanRequest, UpdateStudyPlanRequest } from '../entities/StudyPlan.js';

export interface IStudyPlanRepository {
  // 学習計画の取得
  findByUserId(userId: number): Promise<StudyPlan | null>;
  findById(id: number): Promise<StudyPlan | null>;
  findActiveByUserId(userId: number): Promise<StudyPlan | null>;

  // 学習計画の作成・更新
  create(userId: number, data: CreateStudyPlanRequest): Promise<StudyPlan>;
  update(id: number, data: UpdateStudyPlanRequest): Promise<StudyPlan>;
  delete(id: number): Promise<void>;

  // 学習計画の状態管理
  activate(id: number): Promise<StudyPlan>;
  deactivate(id: number): Promise<StudyPlan>;

  // テンプレート管理
  getDefaultTemplate(): Promise<CreateStudyPlanRequest>;
  createFromTemplate(userId: number, templateName: string, customizations?: Partial<CreateStudyPlanRequest>): Promise<StudyPlan>;

  // 統計・分析
  getProgress(studyPlanId: number): Promise<{
    totalWeeks: number;
    completedWeeks: number;
    totalStudyHours: number;
    actualStudyHours: number;
    averageUnderstanding: number;
    remainingDays: number;
  }>;

  // 学習週との連携
  generateWeeks(studyPlanId: number): Promise<void>;
  updateWeekAssignments(studyPlanId: number, weekIds: number[]): Promise<void>;
}