/*
  Warnings:

  - You are about to drop the column `checkedAt` on the `dailytask` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `dailytask` DROP COLUMN `checkedAt`,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE INDEX `DailyTask_dateYMD_idx` ON `DailyTask`(`dateYMD`);

-- RenameIndex
ALTER TABLE `dailytask` RENAME INDEX `DailyTask_templateId_fkey` TO `DailyTask_templateId_idx`;
