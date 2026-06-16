/**
 * SigningService — ed25519 provenance for published context bundles (Module 6).
 *
 * The publisher signs each bundle's manifest with a private key; agents verify
 * with the pinned public key before applying. Asymmetric on purpose: agents
 * never hold the signing secret, so a compromised agent host can't forge a
 * bundle. The private key is generated on first use and persisted (gitignored).
 */

import { generateKeyPairSync, sign as edSign, verify as edVerify } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SIGNING_DIR } from "../lib/config.js";

const PRIV = "ed25519.key";
const PUB = "ed25519.pub";

export class SigningService {
  private privateKeyPem: string | null = null;
  private publicKeyPem: string | null = null;

  private async ensureKeys(): Promise<void> {
    if (this.privateKeyPem && this.publicKeyPem) return;
    await fs.mkdir(SIGNING_DIR, { recursive: true });
    const privPath = path.join(SIGNING_DIR, PRIV);
    const pubPath = path.join(SIGNING_DIR, PUB);

    try {
      this.privateKeyPem = await fs.readFile(privPath, "utf8");
      this.publicKeyPem = await fs.readFile(pubPath, "utf8");
      return;
    } catch {
      // generate below
    }

    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    this.privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    this.publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
    await fs.writeFile(privPath, this.privateKeyPem, { mode: 0o600 });
    await fs.writeFile(pubPath, this.publicKeyPem);
  }

  async publicKey(): Promise<string> {
    await this.ensureKeys();
    return this.publicKeyPem!;
  }

  /** Sign bytes → base64 ed25519 signature. */
  async sign(data: Buffer | string): Promise<string> {
    await this.ensureKeys();
    const buf = typeof data === "string" ? Buffer.from(data) : data;
    return edSign(null, buf, this.privateKeyPem!).toString("base64");
  }

  /** Verify a base64 signature against the current public key. */
  async verify(data: Buffer | string, signatureB64: string): Promise<boolean> {
    await this.ensureKeys();
    const buf = typeof data === "string" ? Buffer.from(data) : data;
    return edVerify(null, buf, this.publicKeyPem!, Buffer.from(signatureB64, "base64"));
  }
}
