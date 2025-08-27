/*
  Warnings:

  - A unique constraint covering the columns `[title,group]` on the table `Template` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Template_title_group_key` ON `Template`(`title`, `group`);
