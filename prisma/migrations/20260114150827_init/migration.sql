-- CreateTable
CREATE TABLE "Story" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "url" TEXT,
    "by" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "time" INTEGER NOT NULL,
    "descendants" INTEGER NOT NULL DEFAULT 0,
    "domain" TEXT,
    "kids" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AiSummary" (
    "storyId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "technical" TEXT NOT NULL,
    "layman" TEXT NOT NULL,
    "comments" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSummary_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
