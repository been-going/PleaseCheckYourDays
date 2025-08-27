/*
  Warnings:

  - The primary key for the `daysummary` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `setting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[userId,dateYMD,templateId]` on the table `DailyTask` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,title,group]` on the table `Template` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `DailyTask` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `DaySummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `FixedCost` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Setting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Template` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `DailyTask_dateYMD_templateId_key` ON `dailytask`;

-- DropIndex
DROP INDEX `Template_title_group_key` ON `template`;

-- AlterTable
ALTER TABLE `dailytask` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `daysummary` DROP PRIMARY KEY,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`userId`, `dateYMD`);

-- AlterTable
ALTER TABLE `fixedcost` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `setting` DROP PRIMARY KEY,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`userId`, `key`);

-- AlterTable
ALTER TABLE `template` ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Goal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `targetDate` DATETIME(3) NOT NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `isAchieved` BOOLEAN NOT NULL DEFAULT false,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `DailyTask_userId_idx` ON `DailyTask`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `DailyTask_userId_dateYMD_templateId_key` ON `DailyTask`(`userId`, `dateYMD`, `templateId`);

-- CreateIndex
CREATE INDEX `DaySummary_userId_idx` ON `DaySummary`(`userId`);

-- CreateIndex
CREATE INDEX `FixedCost_userId_idx` ON `FixedCost`(`userId`);

-- CreateIndex
CREATE INDEX `Setting_userId_idx` ON `Setting`(`userId`);

-- CreateIndex
CREATE INDEX `Template_userId_idx` ON `Template`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `Template_userId_title_group_key` ON `Template`(`userId`, `title`, `group`);

-- AddForeignKey
ALTER TABLE `DailyTask` ADD CONSTRAINT `DailyTask_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Template` ADD CONSTRAINT `Template_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DaySummary` ADD CONSTRAINT `DaySummary_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FixedCost` ADD CONSTRAINT `FixedCost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Goal` ADD CONSTRAINT `Goal_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
