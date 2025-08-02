-- CreateTable
CREATE TABLE "prediction_results" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "predictionDate" TIMESTAMP(3) NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "passProbability" TEXT NOT NULL,
    "studyTimePrediction" TEXT NOT NULL,
    "scorePrediction" TEXT NOT NULL,
    "examReadiness" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prediction_results_pkey" PRIMARY KEY ("id")
);
