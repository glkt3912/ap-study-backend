-- CreateTable
CREATE TABLE "review_items" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "lastStudyDate" TIMESTAMP(3) NOT NULL,
    "nextReviewDate" TIMESTAMP(3) NOT NULL,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "difficulty" INTEGER NOT NULL,
    "understanding" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "forgettingCurveStage" INTEGER NOT NULL DEFAULT 1,
    "intervalDays" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_sessions" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "completedItems" INTEGER NOT NULL DEFAULT 0,
    "sessionDuration" INTEGER NOT NULL,
    "averageUnderstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_sessions_pkey" PRIMARY KEY ("id")
);
