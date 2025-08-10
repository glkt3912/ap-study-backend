-- CreateTable
CREATE TABLE "exam_configs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "targetScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exam_configs_userId_key" ON "exam_configs"("userId");

-- AddForeignKey
ALTER TABLE "exam_configs" ADD CONSTRAINT "exam_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;