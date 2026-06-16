import cors from "cors";
import express from "express";
import { CONTEXT_REPO_DIR, PORT } from "./lib/config.js";
import { createPrRouter } from "./routes/pr.js";
import { GitService } from "./services/GitService.js";

async function main() {
  const git = new GitService(CONTEXT_REPO_DIR);
  await git.ensureRepo();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/context/pr", createPrRouter(git));

  app.listen(PORT, () => {
    console.log(`[context-studio] server listening on http://localhost:${PORT}`);
    console.log(`[context-studio] context repo: ${CONTEXT_REPO_DIR}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
