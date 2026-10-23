import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 s): works with Google Authenticator, Authy, 1Password…
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const c of s.replace(/=+$/, "").toUpperCase()) {
    const i = ALPHABET.indexOf(c);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const generateTotpSecret = () => base32Encode(randomBytes(20));

export function totpAt(secret: string, timeMs = Date.now(), step = 30, digits = 6) {
  const counter = Math.floor(timeMs / 1000 / step);
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

const used = new Map<string, number>(); // userKey:step → expiry, blocks replaying a code inside its validity window

/** Accepts the current code and one step either side (clock drift). A code can be used once. */
export function verifyTotp(secret: string, code: string, userKey = "", now = Date.now(), consume = true) {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return false;
  for (const d of [0, -1, 1]) {
    const t = now + d * 30_000;
    const expected = totpAt(secret, t);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(c))) {
      const mark = `${userKey}:${Math.floor(t / 30_000)}`;
      if (userKey && (used.get(mark) ?? 0) > now) return false;
      if (userKey && consume) {
        used.set(mark, now + 120_000);
        for (const [k, v] of used) if (v < now) used.delete(k);
      }
      return true;
    }
  }
  return false;
}

export const otpauthUrl = (secret: string, account: string, issuer = "Triple A Admin") =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
