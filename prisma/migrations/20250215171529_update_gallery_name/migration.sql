/*
  Warnings:

  - Added the required column `galleyName` to the `Gallery` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Gallery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taggerProducts" TEXT NOT NULL,
    "galleyName" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    CONSTRAINT "Gallery_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Gallery" ("id", "sourceId", "taggerProducts") SELECT "id", "sourceId", "taggerProducts" FROM "Gallery";
DROP TABLE "Gallery";
ALTER TABLE "new_Gallery" RENAME TO "Gallery";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
