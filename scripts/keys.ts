/** Prints fresh production secrets for your environment (.env or secret manager). */
import crypto from "node:crypto";
import { generateSecrets } from "../src/lib/crypto";

const s = generateSecrets();
console.log(`# Paste into your production environment. Keep these secret and backed up:
# losing DATA_ENCRYPTION_KEY makes stored files unreadable.
DATA_ENCRYPTION_KEY=${s.encryptionKey}
SIGNING_PRIVATE_KEY=${s.signingPrivateKey}
SIGNING_PUBLIC_KEY=${s.signingPublicKey}
HASH_SECRET=${s.hashSecret}
CRON_SECRET=${crypto.randomBytes(24).toString("base64url")}`);
