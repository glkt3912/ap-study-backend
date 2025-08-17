export interface StudyPlan {
  id: number;
  userId: number;
  name: string;
  description?: string;
  isActive: boolean;
  startDate: Date;
  targetExamDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Template information (simplified)
  templateId?: string;
  templateName?: string;
  studyWeeksData?: any;
  
  // Essential settings (consolidated)
  settings: StudyPlanSettings;
  
  // Relations
  weeks?: StudyWeek[];
}

export interface StudyPlanSettings {
  [key: string]: any;
  timeSettings?: {
    totalWeeks: number;
    weeklyHours: number;
    dailyHours: number;
  };
  planType?: {
    isCustom: boolean;
    source: string;
  };
  metadata?: Record<string, any>;
  preferences?: Record<string, any>;
  migrationInfo?: {
    migratedFrom: string;
    migrationDate: string;
    originalColumns: string[];
  };
}

export interface StudyPlanEntity extends StudyPlan {}

export interface CreateStudyPlanRequest {
  name: string;
  description?: string;
  templateId?: string;
  templateName?: string;
  studyWeeksData?: any[];
  targetExamDate?: Date;
  startDate?: Date;
  settings?: StudyPlanSettings;
}

export interface UpdateStudyPlanRequest {
  name?: string;
  description?: string;
  templateId?: string;
  templateName?: string;
  targetExamDate?: Date;
  isActive?: boolean;
  settings?: StudyPlanSettings;
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