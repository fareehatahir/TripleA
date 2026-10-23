import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { base32Decode, base32Encode, generateTotpSecret, totpAt, verifyTotp } from "@/lib/totp";
import { cleanHtml } from "@/lib/sanitize";
import { slugify } from "@/lib/slug";
import { brandCss, hexToRgb } from "@/lib/app-settings";

// RFC 6238 Appendix B, SHA-1, secret "12345678901234567890"
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP", () => {
  it("matches the RFC 6238 test vectors (6-digit truncation)", () => {
    expect(totpAt(RFC_SECRET, 59_000)).toBe("287082");
    expect(totpAt(RFC_SECRET, 1111111109_000)).toBe("081804");
    expect(totpAt(RFC_SECRET, 1234567890_000)).toBe("005924");
    expect(totpAt(RFC_SECRET, 2000000000_000)).toBe("279037");
  });
  it("round-trips base32", () => {
    const s = generateTotpSecret();
    expect(base32Encode(base32Decode(s))).toBe(s);
    expect(s).toMatch(/^[A-Z2-7]{32}$/);
  });
  it("accepts one step of clock drift, rejects far-off and malformed codes", () => {
    const now = 1_700_000_000_000;
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now), "", now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now - 30_000), "", now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totpAt(RFC_SECRET, now - 120_000), "", now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345", "", now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "abcdef", "", now)).toBe(false);
  });
  it("does not let a code be used twice", () => {
    const now = 1_800_000_000_000;
    const code = totpAt(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, "user-1", now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, "user-1", now + 1000)).toBe(false);
    expect(verifyTotp(RFC_SECRET, code, "user-2", now + 1000)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, "user-3", now, false)).toBe(true); // peek mode does not consume
    expect(verifyTotp(RFC_SECRET, code, "user-3", now, false)).toBe(true);
  });
});

describe("secrets", () => {
  it("encrypts and decrypts, with a fresh IV each time", () => {
    const a = encryptSecret("smtp-password!"), b = encryptSecret("smtp-password!");
    expect(a).not.toBe(b);
    expect(a).not.toContain("smtp-password");
    expect(decryptSecret(a)).toBe("smtp-password!");
  });
  it("returns null for tampered or empty input instead of throwing", () => {
    const [v, iv, tag, ct] = encryptSecret("x").split(":");
    expect(decryptSecret([v, iv, tag, Buffer.from("tampered").toString("base64")].join(":"))).toBeNull();
    expect(decryptSecret("garbage")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
    expect(ct).toBeTruthy();
  });
});

describe("cleanHtml", () => {
  it("strips scripts, event handlers and unsafe links", () => {
    const out = cleanHtml('<p onclick="x()">Hi<script>alert(1)</script></p><a href="javascript:alert(1)">bad</a><a href="https://ok.example">ok</a><img src=x onerror=alert(1)>')!;
    expect(out).not.toMatch(/script|onclick|onerror|javascript:|<img/i);
    expect(out).toContain('href="https://ok.example"');
    expect(out).toContain('rel="noopener noreferrer nofollow"');
  });
  it("returns null for empty content", () => {
    expect(cleanHtml("<p></p>")).toBeNull();
    expect(cleanHtml("")).toBeNull();
  });
});

describe("slugify", () => {
  it("makes clean URL slugs", () => {
    expect(slugify("Toyota & Lexus 2GR-FE (3.5L)")).toBe("toyota-and-lexus-2gr-fe-3-5l");
    expect(slugify("  Café Racer  ")).toBe("cafe-racer");
    expect(slugify("***")).toBe("");
  });
});

describe("brand colour", () => {
  it("converts hex to space-separated rgb and derives darker shades", () => {
    expect(hexToRgb("#C8102E")).toEqual([200, 16, 46]);
    expect(brandCss("#C8102E")).toBe(":root{--brand-rgb:200 16 46;--brand-hover-rgb:166 13 38;--brand-deep-rgb:138 11 32}");
  });
});
