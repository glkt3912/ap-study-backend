export interface StudyPlan {
  id: number;
  userId: number;
  name: string;
  description?: string;
  totalWeeks: number;
  weeklyHours: number;
  dailyHours: number;
  isActive: boolean;
  isCustom: boolean;
  examDate?: Date;
  startDate: Date;
  endDate?: Date;
  preferences: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  weeks?: StudyWeek[];
}

export interface StudyPlanEntity extends StudyPlan {}

export interface CreateStudyPlanRequest {
  name: string;
  description?: string;
  totalWeeks?: number;
  weeklyHours?: number;
  dailyHours?: number;
  examDate?: Date;
  startDate?: Date;
  preferences?: Record<string, any>;
}

export interface UpdateStudyPlanRequest {
  name?: string;
  description?: string;
  totalWeeks?: number;
  weeklyHours?: number;
  dailyHours?: number;
  examDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  preferences?: Record<string, any>;
}

export interface StudyPlanPreferences {
  focusAreas: string[];
  studyStyle: 'balanced' | 'intensive' | 'flexible';
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  reviewFrequency: number;
  breakDuration: number;
  notificationEnabled: boolean;
}

import { StudyWeek } from './StudyWeek.js';