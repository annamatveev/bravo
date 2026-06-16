-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT
);

-- CreateTable
CREATE TABLE "Pr" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "documentPath" TEXT NOT NULL,
    "draftBranch" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "Pr_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reviewer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decision" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "decidedAt" DATETIME,
    "prId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "Reviewer_prId_fkey" FOREIGN KEY ("prId") REFERENCES "Pr" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reviewer_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlastEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    CONSTRAINT "BlastEntry_prId_fkey" FOREIGN KEY ("prId") REFERENCES "Pr" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttributionEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentPath" TEXT NOT NULL,
    "blockKey" TEXT NOT NULL,
    "mergedAt" DATETIME NOT NULL,
    "prId" TEXT NOT NULL,
    "prTitle" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    CONSTRAINT "AttributionEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Reviewer_prId_authorId_key" ON "Reviewer"("prId", "authorId");

-- CreateIndex
CREATE INDEX "AttributionEntry_documentPath_blockKey_idx" ON "AttributionEntry"("documentPath", "blockKey");
