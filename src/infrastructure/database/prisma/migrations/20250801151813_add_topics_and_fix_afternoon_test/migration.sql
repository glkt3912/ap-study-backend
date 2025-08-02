/*
  Warnings:

  - You are about to drop the column `questionType` on the `afternoon_tests` table. All the data in the column will be lost.
  - Added the required column `category` to the `afternoon_tests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `topics` to the `study_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "afternoon_tests" DROP COLUMN "questionType",
ADD COLUMN     "category" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "study_logs" ADD COLUMN     "topics" TEXT NOT NULL;
