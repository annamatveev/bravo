#!/usr/bin/env node
/**
 * agent-sync — the consumer side of Context Studio's data plane (Module 6).
 *
 * Pulls a published context bundle from a distribution channel, VERIFIES its
 * ed25519 signature against a *pinned* public key and every file's sha256
 * digest, then ATOMICALLY swaps the agent's local context directory. If
 * verification fails, nothing is swapped — the agent keeps its last-good copy.
 *
 * Zero dependencies (node:crypto / node:fs only). In production the channel
 * would be a `git pull`/`rsync` target on the LAN; here it's a directory.
 *
 * Usage:
 *   node clients/agent-sync.mjs \
 *     --channel <dir>/.dist/current \
 *     --agent   agent-refunds \
 *     --pubkey  /etc/context-studio/pubkey.pem   # PINNED, out-of-band \
 *     --out     /srv/agents/refunds/context
 *
 * Security note: pass --pubkey from a copy you pinned out-of-band. Trusting the
 * channel's own pubkey.pem defeats provenance (an attacker could swap both).
 */

import { verify as edVerify, createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function die(msg) {
  console.error(`agent-sync: ${msg}`);
  process.exit(1);
}

const channel = arg("channel");
const agent = arg("agent");
const out = arg("out");
let pubkeyPath = arg("pubkey");

if (!channel || !agent || !out) {
  die("required: --channel <dir> --agent <id> --out <dir> [--pubkey <pinned.pem>]");
}

async function main() {
  // 1. Load manifest + signature.
  const manifestPath = path.join(channel, "manifest.json");
  const manifestBytes = await fs.readFile(manifestPath).catch(() => die(`no manifest at ${manifestPath}`));
  const signatureB64 = (await fs.readFile(path.join(channel, "manifest.sig"), "utf8")).trim();

  // 2. Verify signature with the PINNED public key.
  if (!pubkeyPath) {
    console.warn("agent-sync: WARNING — no --pubkey pinned; trusting channel pubkey.pem (insecure).");
    pubkeyPath = path.join(channel, "pubkey.pem");
  }
  const pubkeyPem = await fs.readFile(pubkeyPath, "utf8");
  const sigOk = edVerify(null, manifestBytes, pubkeyPem, Buffer.from(signatureB64, "base64"));
  if (!sigOk) die("signature verification FAILED — refusing to apply.");

  const manifest = JSON.parse(manifestBytes.toString());

  // 3. Verify every file digest.
  for (const f of manifest.files) {
    const content = await fs.readFile(path.join(channel, f.path)).catch(() => die(`missing file ${f.path}`));
    const digest = createHash("sha256").update(content).digest("hex");
    if (digest !== f.sha256) die(`digest mismatch for ${f.path} — refusing to apply.`);
  }

  // 4. Collect this agent's slice.
  const prefix = `agents/${agent}/`;
  const myFiles = manifest.files.filter((f) => f.path.startsWith(prefix));
  if (myFiles.length === 0) die(`no slice for agent "${agent}" in this bundle.`);

  // 5. Stage into a temp dir, then atomically swap over <out>.
  const staging = `${out}.staging-${process.pid}`;
  await fs.rm(staging, { recursive: true, force: true });
  await fs.mkdir(staging, { recursive: true });
  for (const f of myFiles) {
    const rel = f.path.slice(prefix.length);
    const dest = path.join(staging, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(channel, f.path), dest);
  }
  // Drop a version stamp so the agent can report what it's running.
  await fs.writeFile(path.join(staging, ".version"), `${manifest.version}\n${manifest.generatedAt}\n`);

  const backup = `${out}.old-${process.pid}`;
  await fs.rm(backup, { recursive: true, force: true });
  await fs.rename(out, backup).catch(() => {});
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.rename(staging, out);
  await fs.rm(backup, { recursive: true, force: true });

  console.log(`agent-sync: applied bundle ${manifest.version} for ${agent} (${myFiles.length} file(s)) → ${out}`);
}

main().catch((err) => die(err.message ?? String(err)));
