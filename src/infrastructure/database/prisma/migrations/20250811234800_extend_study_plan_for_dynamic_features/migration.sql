-- AlterTable: Add extended fields for dynamic study plan functionality
ALTER TABLE "study_plans" 
ADD COLUMN "studyStartTime" TEXT,
ADD COLUMN "studyEndTime" TEXT,
ADD COLUMN "studyDays" JSONB,
ADD COLUMN "breakInterval" INTEGER,
ADD COLUMN "focusSessionDuration" INTEGER,
ADD COLUMN "targetExamDate" TIMESTAMP(3),
ADD COLUMN "prioritySubjects" JSONB,
ADD COLUMN "learningStyle" TEXT,
ADD COLUMN "difficultyPreference" TEXT,
ADD COLUMN "customSettings" JSONB;

-- Add comments for documentation
COMMENT ON COLUMN "study_plans"."studyStartTime" IS 'Study start time in HH:MM format';
COMMENT ON COLUMN "study_plans"."studyEndTime" IS 'Study end time in HH:MM format';
COMMENT ON COLUMN "study_plans"."studyDays" IS 'Array of study days as numbers [1,2,3,4,5] (Mon-Fri)';
COMMENT ON COLUMN "study_plans"."breakInterval" IS 'Minutes between study sessions';
COMMENT ON COLUMN "study_plans"."focusSessionDuration" IS 'Minutes per focus session (Pomodoro technique)';
COMMENT ON COLUMN "study_plans"."targetExamDate" IS 'Target examination date';
COMMENT ON COLUMN "study_plans"."prioritySubjects" IS 'Array of priority subjects for study focus';
COMMENT ON COLUMN "study_plans"."learningStyle" IS 'Learning style preference: visual, auditory, kinesthetic, reading';
COMMENT ON COLUMN "study_plans"."difficultyPreference" IS 'Difficulty preference: easy, medium, hard, mixed';
COMMENT ON COLUMN "study_plans"."customSettings" IS 'JSON object containing StudyPlanCustomSettings for dynamic features';