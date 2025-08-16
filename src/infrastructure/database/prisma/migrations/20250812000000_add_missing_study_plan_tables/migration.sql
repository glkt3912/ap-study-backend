-- CreateTable: Add missing tables for dynamic study plan functionality
CREATE TABLE "study_plan_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "defaultPeriodDays" INTEGER NOT NULL,
    "defaultWeeklyHours" INTEGER NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Add study schedule templates for weekly patterns
CREATE TABLE "study_schedule_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weeklyPattern" JSONB NOT NULL,
    "targetDifficulty" TEXT NOT NULL,
    "estimatedHoursPerWeek" INTEGER NOT NULL,
    "isFlexible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_schedule_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Add study recommendations for personalized suggestions
CREATE TABLE "study_recommendations" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "actionable" BOOLEAN NOT NULL DEFAULT true,
    "estimatedImpact" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Add study plan preferences for user customization
CREATE TABLE "study_plan_preferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderTime" TEXT,
    "weekendStudy" BOOLEAN NOT NULL DEFAULT false,
    "intensiveMode" BOOLEAN NOT NULL DEFAULT false,
    "adaptiveDifficulty" BOOLEAN NOT NULL DEFAULT true,
    "notificationPreferences" JSONB NOT NULL DEFAULT '{"email": true, "push": true, "daily": true, "weekly": false}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_plan_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Add study milestones for progress tracking
CREATE TABLE "study_milestones" (
    "id" SERIAL NOT NULL,
    "studyPlanId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedDate" TIMESTAMP(3),
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "study_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Add unique constraints and indexes
CREATE UNIQUE INDEX "study_plan_preferences_userId_key" ON "study_plan_preferences"("userId");

-- AddForeignKey: Add foreign key constraints
ALTER TABLE "study_recommendations" ADD CONSTRAINT "study_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_plan_preferences" ADD CONSTRAINT "study_plan_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "study_milestones" ADD CONSTRAINT "study_milestones_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "study_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "study_plan_templates" IS 'Predefined study plan templates for different learning scenarios';
COMMENT ON TABLE "study_schedule_templates" IS 'Weekly schedule templates with time patterns';
COMMENT ON TABLE "study_recommendations" IS 'AI-generated personalized study recommendations';
COMMENT ON TABLE "study_plan_preferences" IS 'User preferences for study plan customization';
COMMENT ON TABLE "study_milestones" IS 'Study plan milestones and progress tracking';

-- Add column comments
COMMENT ON COLUMN "study_plan_templates"."difficulty" IS 'Template difficulty level: beginner, intermediate, advanced';
COMMENT ON COLUMN "study_plan_templates"."features" IS 'Array of template features and capabilities';
COMMENT ON COLUMN "study_schedule_templates"."weeklyPattern" IS 'WeeklyStudyPattern JSON object with daily schedules';
COMMENT ON COLUMN "study_recommendations"."type" IS 'Recommendation type: topic_focus, time_adjustment, difficulty_change, review_schedule';
COMMENT ON COLUMN "study_recommendations"."priority" IS 'Priority level: low, medium, high';
COMMENT ON COLUMN "study_plan_preferences"."reminderTime" IS 'Daily reminder time in HH:MM format';
COMMENT ON COLUMN "study_plan_preferences"."notificationPreferences" IS 'JSON object with email, push, daily, weekly notification settings';
COMMENT ON COLUMN "study_milestones"."priority" IS 'Milestone priority: low, medium, high';