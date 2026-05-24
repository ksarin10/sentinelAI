import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function deriveKey(secret: string) {
  return scryptSync(secret, "sentinelai-provider-credentials", 32);
}

export function encryptProviderApiKey(plaintext: string, secret: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptProviderApiKey(ciphertext: string, secret: string) {
  const [ivPart, tagPart, dataPart] = ciphertext.split(".");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Invalid provider credential ciphertext");
  }
  const decipher = createDecipheriv(ALGORITHM, deriveKey(secret), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataPart, "base64url")), decipher.final()]);
  return decrypted.toString("utf8");
}
