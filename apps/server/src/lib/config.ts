import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// apps/server root (two levels up from src/lib).
export const SERVER_ROOT = path.resolve(__dirname, "..", "..");

export const PORT = Number(process.env.PORT ?? 4000);

export const CONTEXT_REPO_DIR = path.resolve(
  SERVER_ROOT,
  process.env.CONTEXT_REPO_DIR ?? ".context-repo",
);
