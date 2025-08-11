-- CreateTable
CREATE TABLE "study_plans" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalWeeks" INTEGER NOT NULL DEFAULT 12,
    "weeklyHours" INTEGER NOT NULL DEFAULT 25,
    "dailyHours" INTEGER NOT NULL DEFAULT 3,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "examDate" TIMESTAMP(3),
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "study_plans_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "study_weeks" ADD COLUMN "studyPlanId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "study_plans_userId_key" ON "study_plans"("userId");

-- AddForeignKey
ALTER TABLE "study_weeks" ADD CONSTRAINT "study_weeks_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "study_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_plans" ADD CONSTRAINT "study_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;