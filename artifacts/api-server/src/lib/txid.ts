import { randomBytes } from "node:crypto";

/**
 * Generates a unique transaction ID in the format:
 * MF-YYYYMMDD-XXXXXXXX  (X = uppercase alphanumeric, 8 chars)
 * e.g. MF-20260629-A3KX72PQ
 */
export function generateTxId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = randomBytes(5).toString("base64url").toUpperCase().slice(0, 8);
  return `MF-${date}-${rand}`;
}
