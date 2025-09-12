-- AlterTable
ALTER TABLE `template` ADD COLUMN `enableNote` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `enableValue` BOOLEAN NOT NULL DEFAULT false;
