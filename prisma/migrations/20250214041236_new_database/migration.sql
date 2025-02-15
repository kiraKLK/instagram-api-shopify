/*
  Warnings:

  - You are about to drop the column `accountId` on the `Gallery` table. All the data in the column will be lost.
  - You are about to drop the column `accountId` on the `WidgetSetting` table. All the data in the column will be lost.
  - Added the required column `sourceId` to the `Gallery` table without a default value. This is not possible if the table is not empty.
  - Added the required column `galleryId` to the `WidgetSetting` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Source" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceName" TEXT NOT NULL,
    "items" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    CONSTRAINT "Source_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Gallery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taggerProducts" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    CONSTRAINT "Gallery_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Gallery" ("id", "taggerProducts") SELECT "id", "taggerProducts" FROM "Gallery";
DROP TABLE "Gallery";
ALTER TABLE "new_Gallery" RENAME TO "Gallery";
CREATE TABLE "new_WidgetSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "widgetName" TEXT NOT NULL,
    "gallary" TEXT NOT NULL,
    "widgetTemplate" TEXT NOT NULL,
    "numberOfColumns" INTEGER NOT NULL,
    "numberOfRows" INTEGER NOT NULL,
    "paddingImg" INTEGER NOT NULL,
    "borderImg" INTEGER NOT NULL,
    "galleryId" INTEGER NOT NULL,
    "widgetLayout" INTEGER NOT NULL,
    CONSTRAINT "WidgetSetting_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WidgetSetting" ("borderImg", "gallary", "id", "numberOfColumns", "numberOfRows", "paddingImg", "widgetLayout", "widgetName", "widgetTemplate") SELECT "borderImg", "gallary", "id", "numberOfColumns", "numberOfRows", "paddingImg", "widgetLayout", "widgetName", "widgetTemplate" FROM "WidgetSetting";
DROP TABLE "WidgetSetting";
ALTER TABLE "new_WidgetSetting" RENAME TO "WidgetSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
