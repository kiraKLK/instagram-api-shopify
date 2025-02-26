/*
  Warnings:

  - You are about to drop the column `widgetSettingId` on the `Account` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "WidgetSetting_accountId_key";

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accessToken" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "Account_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("accessToken", "accountName", "id", "sessionId") SELECT "accessToken", "accountName", "id", "sessionId" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
