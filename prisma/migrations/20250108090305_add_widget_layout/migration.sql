/*
  Warnings:

  - Added the required column `widgetLayout` to the `WidgetSetting` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WidgetSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "widgetName" TEXT NOT NULL,
    "gallary" TEXT NOT NULL,
    "widgetTemplate" TEXT NOT NULL,
    "numberOfColumns" INTEGER NOT NULL,
    "numberOfRows" INTEGER NOT NULL,
    "paddingImg" INTEGER NOT NULL,
    "borderImg" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    "widgetLayout" INTEGER NOT NULL,
    CONSTRAINT "WidgetSetting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WidgetSetting" ("accountId", "borderImg", "gallary", "id", "numberOfColumns", "numberOfRows", "paddingImg", "widgetName", "widgetTemplate") SELECT "accountId", "borderImg", "gallary", "id", "numberOfColumns", "numberOfRows", "paddingImg", "widgetName", "widgetTemplate" FROM "WidgetSetting";
DROP TABLE "WidgetSetting";
ALTER TABLE "new_WidgetSetting" RENAME TO "WidgetSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
