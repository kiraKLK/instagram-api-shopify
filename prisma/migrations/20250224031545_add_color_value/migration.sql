/*
  Warnings:

  - Added the required column `heading` to the `WidgetSetting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotSpotColor` to the `WidgetSetting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotSpotHoverColor` to the `WidgetSetting` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WidgetSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "widgetName" TEXT NOT NULL,
    "gallary" TEXT NOT NULL,
    "widgetTemplate" TEXT NOT NULL,
    "hotSpotHoverColor" TEXT NOT NULL,
    "hotSpotColor" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "numberOfColumns" INTEGER NOT NULL,
    "numberOfRows" INTEGER NOT NULL,
    "paddingImg" INTEGER NOT NULL,
    "borderImg" INTEGER NOT NULL,
    "galleryId" INTEGER NOT NULL,
    "widgetLayout" INTEGER NOT NULL,
    CONSTRAINT "WidgetSetting_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WidgetSetting" ("borderImg", "gallary", "galleryId", "id", "numberOfColumns", "numberOfRows", "paddingImg", "widgetLayout", "widgetName", "widgetTemplate") SELECT "borderImg", "gallary", "galleryId", "id", "numberOfColumns", "numberOfRows", "paddingImg", "widgetLayout", "widgetName", "widgetTemplate" FROM "WidgetSetting";
DROP TABLE "WidgetSetting";
ALTER TABLE "new_WidgetSetting" RENAME TO "WidgetSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
