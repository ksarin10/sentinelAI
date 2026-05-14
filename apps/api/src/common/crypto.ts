import { createHash, randomBytes } from "crypto";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createApiKey() {
  const secret = `sai_${randomBytes(32).toString("base64url")}`;
  return {
    secret,
    prefix: secret.slice(0, 12),
    hash: sha256(secret)
  };
}
