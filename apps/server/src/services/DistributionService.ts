/**
 * DistributionService — the publish side of the data plane (Module 6).
 *
 * On publish it renders a per-agent context slice (llms.txt + .fcontext) for
 * each registered agent — least privilege: an agent only receives the documents
 * it's authorized for — then writes a signed, content-addressed bundle to the
 * distribution channel (a directory). Agents pull from there, verify the
 * ed25519 signature + per-file digests, and atomically swap their context.
 *
 * The bundle is built in a staging dir and atomically renamed over
 * `<DIST_DIR>/current`, so a puller never sees a half-written bundle.
 */

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { DistributionStatus, RegisteredAgent } from "@context-studio/types";
import { DIST_DIR } from "../lib/config.js";
import { MAIN_BRANCH } from "./GitService.js";
import type { WorkspaceContext } from "./WorkspaceManager.js";
import { ExportService } from "./ExportService.js";
import type { SigningService } from "./SigningService.js";

interface BundleFile {
  path: string; // relative to the bundle root
  sha256: string;
  bytes: number;
}

interface BundleManifest {
  version: string;
  generatedAt: string;
  agents: Array<{ agentId: string; agentName: string; documents: string[] }>;
  files: BundleFile[];
}

export class DistributionService {
  constructor(
    private readonly ctx: WorkspaceContext,
    private readonly signing: SigningService,
  ) {}

  /** Documents an agent may receive: explicit `reads`, else keyword-matched. */
  private async docsForAgent(agent: RegisteredAgent): Promise<string[]> {
    if (agent.reads?.length) {
      return agent.reads.filter((d) => this.ctx.documents.includes(d));
    }
    const matched: string[] = [];
    for (const doc of this.ctx.documents) {
      const content = (await this.ctx.git.readDocument(MAIN_BRANCH, doc)).toLowerCase();
      if (agent.watches.some((w) => content.includes(w))) matched.push(doc);
    }
    return matched;
  }

  async publish(generatedAt: string): Promise<DistributionStatus> {
    const exporter = new ExportService(this.ctx.git);
    await fs.mkdir(DIST_DIR, { recursive: true });
    const staging = path.join(DIST_DIR, `.staging-${process.pid}`);
    await fs.rm(staging, { recursive: true, force: true });
    await fs.mkdir(staging, { recursive: true });

    const files: BundleFile[] = [];
    const agentsMeta: BundleManifest["agents"] = [];

    const writeFile = async (rel: string, content: string) => {
      const abs = path.join(staging, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content);
      files.push({
        path: rel,
        sha256: createHash("sha256").update(content).digest("hex"),
        bytes: Buffer.byteLength(content),
      });
    };

    for (const agent of this.ctx.agents) {
      const docs = await this.docsForAgent(agent);
      const llms = await exporter.buildLlmsTxt(docs);
      const fcontext = await exporter.buildFcontext(docs);
      await writeFile(`agents/${agent.id}/llms.txt`, llms);
      await writeFile(
        `agents/${agent.id}/.fcontext.json`,
        JSON.stringify(fcontext, null, 2),
      );
      agentsMeta.push({ agentId: agent.id, agentName: agent.name, documents: docs });
    }

    // Version = content hash over the sorted per-file digests (deterministic).
    const version = createHash("sha256")
      .update(files.map((f) => `${f.path}:${f.sha256}`).sort().join("\n"))
      .digest("hex")
      .slice(0, 16);

    const manifest: BundleManifest = { version, generatedAt, agents: agentsMeta, files };
    const manifestJson = JSON.stringify(manifest, null, 2);
    const signature = await this.signing.sign(manifestJson);

    await fs.writeFile(path.join(staging, "manifest.json"), manifestJson);
    await fs.writeFile(path.join(staging, "manifest.sig"), signature);
    await fs.writeFile(path.join(staging, "pubkey.pem"), await this.signing.publicKey());

    // Atomic swap: replace <DIST_DIR>/current in one rename.
    const current = path.join(DIST_DIR, "current");
    const old = path.join(DIST_DIR, `.old-${process.pid}`);
    await fs.rm(old, { recursive: true, force: true });
    await fs.rename(current, old).catch(() => {});
    await fs.rename(staging, current);
    await fs.rm(old, { recursive: true, force: true });

    return this.toStatus(manifest, await this.signing.publicKey());
  }

  async status(): Promise<DistributionStatus> {
    try {
      const manifestJson = await fs.readFile(
        path.join(DIST_DIR, "current", "manifest.json"),
        "utf8",
      );
      const pubkey = await fs
        .readFile(path.join(DIST_DIR, "current", "pubkey.pem"), "utf8")
        .catch(() => undefined);
      return this.toStatus(JSON.parse(manifestJson) as BundleManifest, pubkey);
    } catch {
      return { published: false, agents: [] };
    }
  }

  private toStatus(manifest: BundleManifest, publicKeyPem?: string): DistributionStatus {
    return {
      published: true,
      version: manifest.version,
      generatedAt: manifest.generatedAt,
      publicKeyPem,
      agents: manifest.agents.map((a) => {
        const agentFiles = manifest.files.filter((f) =>
          f.path.startsWith(`agents/${a.agentId}/`),
        );
        return {
          agentId: a.agentId,
          agentName: a.agentName,
          documents: a.documents,
          files: agentFiles.length,
          bytes: agentFiles.reduce((s, f) => s + f.bytes, 0),
        };
      }),
    };
  }
}
