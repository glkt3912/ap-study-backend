/*
  Warnings:

  - You are about to drop the column `breakInterval` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `customSettings` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `dailyHours` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `difficultyPreference` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `examDate` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `focusSessionDuration` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `isCustom` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `learningStyle` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `preferences` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `prioritySubjects` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `studyDays` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `studyEndTime` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `studyStartTime` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `totalWeeks` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the column `weeklyHours` on the `study_plans` table. All the data in the column will be lost.
  - You are about to drop the `analysis_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `prediction_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `review_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `review_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `study_recommendations` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[studyPlanId,weekNumber]` on the table `study_weeks` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "analysis_results" DROP CONSTRAINT "analysis_results_userId_fkey";

-- DropForeignKey
ALTER TABLE "prediction_results" DROP CONSTRAINT "prediction_results_userId_fkey";

-- DropForeignKey
ALTER TABLE "review_items" DROP CONSTRAINT "review_items_userId_fkey";

-- DropForeignKey
ALTER TABLE "review_sessions" DROP CONSTRAINT "review_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "study_recommendations" DROP CONSTRAINT "study_recommendations_userId_fkey";

-- DropIndex
DROP INDEX "study_weeks_weekNumber_key";

-- AlterTable
ALTER TABLE "study_plans" DROP COLUMN "breakInterval",
DROP COLUMN "customSettings",
DROP COLUMN "dailyHours",
DROP COLUMN "difficultyPreference",
DROP COLUMN "endDate",
DROP COLUMN "examDate",
DROP COLUMN "focusSessionDuration",
DROP COLUMN "isCustom",
DROP COLUMN "learningStyle",
DROP COLUMN "metadata",
DROP COLUMN "preferences",
DROP COLUMN "prioritySubjects",
DROP COLUMN "studyDays",
DROP COLUMN "studyEndTime",
DROP COLUMN "studyStartTime",
DROP COLUMN "totalWeeks",
DROP COLUMN "weeklyHours",
ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "studyWeeksData" JSONB,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "templateName" TEXT;

-- DropTable
DROP TABLE "analysis_results";

-- DropTable
DROP TABLE "prediction_results";

-- DropTable
DROP TABLE "review_items";

-- DropTable
DROP TABLE "review_sessions";

-- DropTable
DROP TABLE "study_recommendations";

-- CreateIndex
CREATE UNIQUE INDEX "study_weeks_studyPlanId_weekNumber_key" ON "study_weeks"("studyPlanId", "weekNumber");
