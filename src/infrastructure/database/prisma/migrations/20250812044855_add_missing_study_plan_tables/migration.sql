/*
  Warnings:

  - The `tags` column on the `questions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `analysis_results` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `studyPattern` on the `analysis_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `weaknessAnalysis` on the `analysis_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `studyRecommendation` on the `analysis_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `userId` to the `prediction_results` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `passProbability` on the `prediction_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `studyTimePrediction` on the `prediction_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `scorePrediction` on the `prediction_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `examReadiness` on the `prediction_results` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `choices` on the `questions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `userId` to the `quiz_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `review_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `review_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `user_answers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "analysis_results" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
DROP COLUMN "studyPattern",
ADD COLUMN     "studyPattern" JSONB NOT NULL,
DROP COLUMN "weaknessAnalysis",
ADD COLUMN     "weaknessAnalysis" JSONB NOT NULL,
DROP COLUMN "studyRecommendation",
ADD COLUMN     "studyRecommendation" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "prediction_results" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL,
DROP COLUMN "passProbability",
ADD COLUMN     "passProbability" JSONB NOT NULL,
DROP COLUMN "studyTimePrediction",
ADD COLUMN     "studyTimePrediction" JSONB NOT NULL,
DROP COLUMN "scorePrediction",
ADD COLUMN     "scorePrediction" JSONB NOT NULL,
DROP COLUMN "examReadiness",
ADD COLUMN     "examReadiness" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "choices",
ADD COLUMN     "choices" JSONB NOT NULL,
DROP COLUMN "tags",
ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "quiz_sessions" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "review_items" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "review_sessions" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "user_answers" DROP COLUMN "userId",
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "analysis_results" ADD CONSTRAINT "analysis_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_sessions" ADD CONSTRAINT "review_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_answers" ADD CONSTRAINT "user_answers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
