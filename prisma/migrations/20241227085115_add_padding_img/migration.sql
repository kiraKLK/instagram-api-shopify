/*
  Warnings:

  - Added the required column `borderImg` to the `WidgetSetting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paddingImg` to the `WidgetSetting` table without a default value. This is not possible if the table is not empty.

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
    CONSTRAINT "WidgetSetting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WidgetSetting" ("accountId", "gallary", "id", "numberOfColumns", "numberOfRows", "widgetName", "widgetTemplate") SELECT "accountId", "gallary", "id", "numberOfColumns", "numberOfRows", "widgetName", "widgetTemplate" FROM "WidgetSetting";
DROP TABLE "WidgetSetting";
ALTER TABLE "new_WidgetSetting" RENAME TO "WidgetSetting";
CREATE UNIQUE INDEX "WidgetSetting_accountId_key" ON "WidgetSetting"("accountId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
