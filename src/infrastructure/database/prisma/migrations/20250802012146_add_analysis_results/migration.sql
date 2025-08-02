-- CreateTable
CREATE TABLE "analysis_results" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "analysisDate" TIMESTAMP(3) NOT NULL,
    "studyPattern" TEXT NOT NULL,
    "weaknessAnalysis" TEXT NOT NULL,
    "studyRecommendation" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);
