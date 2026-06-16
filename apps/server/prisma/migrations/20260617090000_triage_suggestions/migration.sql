-- Triage suggestions: classify review tickets and let an agent raise them.
ALTER TABLE "ReviewTicket" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'freshness';
ALTER TABLE "ReviewTicket" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "ReviewTicket" ADD COLUMN "relatedPaths" TEXT;
ALTER TABLE "ReviewTicket" ADD COLUMN "raisedBy" TEXT;
