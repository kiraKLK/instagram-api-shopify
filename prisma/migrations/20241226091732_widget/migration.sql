-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN,
    "emailVerified" BOOLEAN
);

-- CreateTable
CREATE TABLE "Account" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "accessToken" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "widgetSettingId" INTEGER,
    CONSTRAINT "Account_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WidgetSetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "widgetName" TEXT NOT NULL,
    "gallary" TEXT NOT NULL,
    "widgetTemplate" TEXT NOT NULL,
    "numberOfColumns" INTEGER NOT NULL,
    "numberOfRows" INTEGER NOT NULL,
    "accountId" INTEGER NOT NULL,
    CONSTRAINT "WidgetSetting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetSetting_accountId_key" ON "WidgetSetting"("accountId");
