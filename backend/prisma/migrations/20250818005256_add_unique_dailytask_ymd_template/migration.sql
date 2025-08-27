/*
  Warnings:

  - A unique constraint covering the columns `[dateYMD,templateId]` on the table `DailyTask` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `DailyTask_dateYMD_templateId_key` ON `DailyTask`(`dateYMD`, `templateId`);
