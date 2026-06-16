-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "accessRole" TEXT NOT NULL DEFAULT 'reviewer'
);
INSERT INTO "new_Author" ("id", "kind", "name", "role") SELECT "id", "kind", "name", "role" FROM "Author";
DROP TABLE "Author";
ALTER TABLE "new_Author" RENAME TO "Author";
CREATE UNIQUE INDEX "Author_email_key" ON "Author"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
